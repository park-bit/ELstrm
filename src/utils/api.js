import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { BUILTIN_SOURCES, findSource } from './sources';
import { parseAndGroup, parseM3U, groupWithFallbacks } from './m3uParser';
import { TTLCache } from './ttlCache';

// Everything here runs on-device. There is no backend: on native
// Android/iOS, CapacitorHttp issues the request through native networking
// libraries, which are not subject to the webview's CORS policy at all -
// that's what made the old FastAPI proxy unnecessary. In a plain browser
// tab (e.g. `npm run dev` outside the app shell) we fall back to normal
// fetch, which *is* subject to CORS - that's an inherent limitation of
// testing as a website rather than something a server could fix for free,
// since the playlist hosts don't send CORS headers either way.

const isNative = Capacitor.isNativePlatform();

const playlistCache = new TTLCache(15 * 60 * 1000); // 15 min
const probeCache = new TTLCache(60 * 1000); // 1 min

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchText(url) {
  if (isNative) {
    let response;
    try {
      response = await CapacitorHttp.get({
        url,
        headers: REQUEST_HEADERS,
        connectTimeout: 5000,
        readTimeout: 15000,
      });
    } catch (err) {
      throw new ApiError(`Could not reach that playlist: ${err?.message || err}`, 0);
    }
    if (response.status >= 400) {
      throw new ApiError(`Upstream returned ${response.status}`, response.status);
    }
    // CapacitorHttp may already parse JSON-looking bodies; M3U is plain
    // text, so `data` should be a string here, but guard just in case.
    return typeof response.data === 'string' ? response.data : String(response.data);
  }

  // Browser fallback (dev/testing in a plain tab).
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new ApiError(
      'Could not reach that playlist (this may be a browser CORS limitation - try running the built app instead).',
      0
    );
  }
  if (!response.ok) {
    throw new ApiError(`Upstream returned ${response.status}`, response.status);
  }
  return response.text();
}

export async function fetchSources() {
  return BUILTIN_SOURCES;
}

export async function fetchUnifiedPlaylist(customSources = []) {
  const cacheKey = 'unified-playlist';
  const cached = playlistCache.get(cacheKey);
  if (cached) return cached;

  const allSources = [...BUILTIN_SOURCES, ...customSources];
  
  const promises = allSources.map(async (src) => {
    try {
      const text = await fetchText(src.url);
      return { text, defaultGroup: src.name };
    } catch (err) {
      console.warn(`Failed to fetch source ${src.name}:`, err);
      throw err;
    }
  });

  const results = await Promise.allSettled(promises);
  
  let allRaw = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { text, defaultGroup } = result.value;
      allRaw.push(...parseM3U(text, defaultGroup));
    }
  }

  if (allRaw.length === 0) {
    throw new ApiError('No channels could be parsed from any source', 422);
  }

  const grouped = groupWithFallbacks(allRaw);
  const categories = Array.from(
    new Set(grouped.map((g) => g.group || 'Uncategorized'))
  ).sort();
  
  const payload = { status: 'success', total: grouped.length, categories, channels: grouped };
  playlistCache.set(cacheKey, payload);
  return payload;
}

export async function checkStream(url) {
  const cached = probeCache.get(url);
  if (cached) return cached;

  let result = { url, ok: false };
  try {
    if (isNative) {
      const response = await CapacitorHttp.get({
        url,
        headers: { ...REQUEST_HEADERS, Range: 'bytes=0-1024' },
        connectTimeout: 4000,
        readTimeout: 4000,
      });
      result = { url, ok: response.status < 400, statusCode: response.status };
    } else {
      const response = await fetch(url, {
        headers: { Range: 'bytes=0-1024' },
      });
      result = { url, ok: response.ok, statusCode: response.status };
    }
  } catch (err) {
    result = { url, ok: false, error: String(err?.message || err) };
  }

  probeCache.set(url, result);
  return result;
}

export { ApiError };
