"""
ELstrm backend.

Acts as a server-side proxy + parser for M3U playlists so the frontend
never has to fight CORS against arbitrary third-party stream hosts, and
exposes a tiny probe endpoint the player uses to test whether a given
stream URL is alive before/while switching sources.
"""
import asyncio
import logging
import os

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from cache import TTLCache
from m3u import group_with_fallbacks, parse_m3u
from sources import BUILTIN_SOURCES, find_source

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("elstrm")

app = FastAPI(title="ELstrm backend")

# Comma-separated list of allowed origins, e.g. "https://elstrm.app,https://www.elstrm.app".
# Defaults to "*" for local development. No credentials/cookies cross this
# boundary, so a wildcard is safe here, but a deployed instance can lock
# this down via the CORS_ALLOW_ORIGINS env var.
_allowed_origins_env = os.environ.get("CORS_ALLOW_ORIGINS", "*")
ALLOWED_ORIGINS = (
    ["*"]
    if _allowed_origins_env.strip() == "*"
    else [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

playlist_cache = TTLCache(ttl_seconds=15 * 60)
probe_cache = TTLCache(ttl_seconds=60)


REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}
FETCH_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)


@app.get("/")
def root():
    return {
        "service": "ELstrm backend",
        "endpoints": ["/api/health", "/api/sources", "/api/playlist", "/api/stream-check"],
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/sources")
def list_sources():
    """Built-in catalog of free, legal playlist sources."""
    return {
        "status": "success",
        "sources": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "kind": s.kind,
            }
            for s in BUILTIN_SOURCES
        ],
    }


async def _fetch_text(url: str) -> str:
    async with httpx.AsyncClient(
        timeout=FETCH_TIMEOUT, headers=REQUEST_HEADERS, follow_redirects=True
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


@app.get("/api/playlist")
async def get_playlist(
    source: str | None = Query(default=None, description="Built-in source id"),
    url: str | None = Query(default=None, description="Arbitrary M3U playlist URL"),
):
    """
    Fetch + parse a playlist, either from a built-in source id or an
    arbitrary M3U URL, and return channels grouped with fallback source
    lists for channels that appear more than once under the same name.
    """
    if not source and not url:
        raise HTTPException(400, "Provide either 'source' or 'url'")

    if source:
        src = find_source(source)
        if not src:
            raise HTTPException(404, f"Unknown source id '{source}'")
        target_url = src.url
        cache_key = f"source:{source}"
        default_group = src.name
    else:
        target_url = url
        cache_key = f"url:{url}"
        default_group = ""

    cached = playlist_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        text = await _fetch_text(target_url)
    except httpx.TimeoutException:
        raise HTTPException(504, "Timed out fetching the playlist")
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Upstream returned {e.response.status_code}")
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Failed to fetch playlist: {e}")

    raw = parse_m3u(text, default_group=default_group)
    if not raw:
        raise HTTPException(422, "No channels could be parsed from this playlist")

    grouped = group_with_fallbacks(raw)
    categories = sorted({g.group for g in grouped if g.group})

    payload = {
        "status": "success",
        "total": len(grouped),
        "categories": categories,
        "channels": [
            {
                "name": g.name,
                "logo": g.logo,
                "group": g.group or "Uncategorized",
                "tvgId": g.tvg_id,
                "sources": g.sources,
            }
            for g in grouped
        ],
    }
    playlist_cache.set(cache_key, payload)
    return payload


@app.get("/api/stream-check")
async def stream_check(url: str = Query(...)):
    """
    Probe whether a stream URL currently looks reachable, used by the
    frontend to decide whether to fall back to the next source for a
    channel. A cheap range-GET is used instead of HEAD because many
    IPTV/HLS origins don't implement HEAD correctly.
    """
    cached = probe_cache.get(url)
    if cached is not None:
        return cached

    result = {"url": url, "ok": False}
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=4.0, read=4.0, write=4.0, pool=4.0),
            headers={**REQUEST_HEADERS, "Range": "bytes=0-1024"},
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            result["ok"] = resp.status_code < 400
            result["status_code"] = resp.status_code
    except httpx.HTTPError as e:
        result["error"] = str(e)

    probe_cache.set(url, result)
    return result


@app.get("/api/stream-check-batch")
async def stream_check_batch(urls: list[str] = Query(...)):
    """Probe several stream URLs concurrently. Used to pre-flight a
    channel's fallback chain in one round trip instead of one-by-one."""
    results = await asyncio.gather(*(stream_check(u) for u in urls))
    return {"results": results}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
