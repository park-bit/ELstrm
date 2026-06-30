// Thin localStorage wrapper. Every read/write is try/caught so a private
// browsing mode or quota error never crashes the app - it just behaves as
// if nothing was ever saved.

const KEYS = {
  FAVORITES: 'elstrm.favorites.v1',
  CUSTOM_SOURCES: 'elstrm.customSources.v1',
  LAST_WATCHED: 'elstrm.lastWatched.v1',
  LAST_SOURCE: 'elstrm.lastSource.v1',
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore - storage unavailable or full
  }
}

// A channel is identified by tvgId when present, otherwise by name+group,
// since the same logical channel should keep its favorite/last-watched
// status across different source playlists when possible.
export function channelKey(channel) {
  if (channel.tvgId) return `id:${channel.tvgId}`;
  return `ng:${channel.name}::${channel.group}`;
}

export function getFavorites() {
  return safeGet(KEYS.FAVORITES, []);
}

export function isFavorite(channel) {
  return getFavorites().includes(channelKey(channel));
}

export function toggleFavorite(channel) {
  const key = channelKey(channel);
  const current = getFavorites();
  const next = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key];
  safeSet(KEYS.FAVORITES, next);
  return next.includes(key);
}

export function getCustomSources() {
  return safeGet(KEYS.CUSTOM_SOURCES, []);
}

export function addCustomSource({ name, url }) {
  const current = getCustomSources();
  const id = `custom:${url}`;
  if (current.some((s) => s.id === id)) return current;
  const next = [...current, { id, name: name || url, url, kind: 'custom' }];
  safeSet(KEYS.CUSTOM_SOURCES, next);
  return next;
}

export function removeCustomSource(id) {
  const next = getCustomSources().filter((s) => s.id !== id);
  safeSet(KEYS.CUSTOM_SOURCES, next);
  return next;
}

export function getLastWatched() {
  return safeGet(KEYS.LAST_WATCHED, null);
}

export function setLastWatched(channel, sourceContext) {
  safeSet(KEYS.LAST_WATCHED, {
    channel,
    sourceContext,
    watchedAt: Date.now(),
  });
}

export function getLastSource() {
  return safeGet(KEYS.LAST_SOURCE, null);
}

export function setLastSource(sourceContext) {
  safeSet(KEYS.LAST_SOURCE, sourceContext);
}

export function removeLastSource() {
  localStorage.removeItem(KEYS.LAST_SOURCE);
}
