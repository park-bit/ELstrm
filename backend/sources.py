"""
Built-in source catalog.

Every entry here points at a free, publicly-listed M3U playlist from the
iptv-org project (https://github.com/iptv-org/iptv) - a community index of
stream URLs that channels/broadcasters make available without a login.
No credentials, scraping, or private/paid catalogs are involved.

Users can additionally add their own custom M3U URL from the UI - the
app does not hardcode anything beyond this starter list.
"""
from dataclasses import dataclass


@dataclass
class SourceDef:
    id: str
    name: str
    description: str
    kind: str  # "country" | "category" | "language"
    url: str


_BASE = "https://iptv-org.github.io/iptv"

BUILTIN_SOURCES: list[SourceDef] = [
    SourceDef(
        id="in",
        name="India",
        description="Free-to-air Indian channels",
        kind="country",
        url=f"{_BASE}/countries/in.m3u",
    ),
    SourceDef(
        id="us",
        name="United States",
        description="Free-to-air US channels",
        kind="country",
        url=f"{_BASE}/countries/us.m3u",
    ),
    SourceDef(
        id="uk",
        name="United Kingdom",
        description="Free-to-air UK channels",
        kind="country",
        url=f"{_BASE}/countries/uk.m3u",
    ),
    SourceDef(
        id="ca",
        name="Canada",
        description="Free-to-air Canadian channels",
        kind="country",
        url=f"{_BASE}/countries/ca.m3u",
    ),
    SourceDef(
        id="news",
        name="News",
        description="Global news channels",
        kind="category",
        url=f"{_BASE}/categories/news.m3u",
    ),
    SourceDef(
        id="sports",
        name="Sports",
        description="Global sports channels",
        kind="category",
        url=f"{_BASE}/categories/sports.m3u",
    ),
    SourceDef(
        id="movies",
        name="Movies",
        description="Free movie channels",
        kind="category",
        url=f"{_BASE}/categories/movies.m3u",
    ),
    SourceDef(
        id="music",
        name="Music",
        description="Global music channels",
        kind="category",
        url=f"{_BASE}/categories/music.m3u",
    ),
    SourceDef(
        id="eng",
        name="English speaking",
        description="Channels broadcasting in English worldwide",
        kind="language",
        url=f"{_BASE}/languages/eng.m3u",
    ),
]


def find_source(source_id: str) -> SourceDef | None:
    for s in BUILTIN_SOURCES:
        if s.id == source_id:
            return s
    return None
