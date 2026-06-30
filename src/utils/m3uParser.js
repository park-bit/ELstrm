// M3U / M3U8 extended playlist parser, ported from the (now removed)
// FastAPI backend's m3u.py. Runs entirely on-device - no server needed.

const EXTINF_ATTR_RE = /([a-zA-Z0-9-]+)="([^"]*)"/g;
const QUALITY_SUFFIX_RE = /\s*[([]\s*(\d{3,4}p|hd|fhd|uhd|4k|sd)\s*[)\]]\s*$/i;
const QUALITY_WORD_RE = /\b(hd|fhd|uhd|4k|sd|backup|raw)\b/gi;

/**
 * Parse raw M3U text into a flat list of { name, url, logo, group, tvgId }.
 * Tolerant of CRLF/LF, blank lines, missing attributes, and any #-prefixed
 * tag other than #EXTINF (ignored rather than causing a parse failure).
 */
export function parseM3U(text, defaultGroup = '') {
  const channels = [];
  let pendingAttrs = null;
  let pendingName = '';

  const lines = text.split(/\r\n|\r|\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const attrs = {};
      let match;
      EXTINF_ATTR_RE.lastIndex = 0;
      while ((match = EXTINF_ATTR_RE.exec(line)) !== null) {
        attrs[match[1]] = match[2];
      }
      const commaIdx = line.lastIndexOf(',');
      const name = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'Unknown';
      pendingAttrs = attrs;
      pendingName = name || 'Unknown';
      continue;
    }

    if (line.startsWith('#')) {
      continue; // any other tag - ignore
    }

    if (pendingAttrs !== null && (line.startsWith('http://') || line.startsWith('https://'))) {
      channels.push({
        name: pendingName,
        url: line,
        logo: pendingAttrs['tvg-logo'] || '',
        group: pendingAttrs['group-title'] || defaultGroup || 'Uncategorized',
        tvgId: pendingAttrs['tvg-id'] || '',
      });
      pendingAttrs = null;
      pendingName = '';
    }
  }

  return channels;
}

/** Strip trailing resolution/quality noise like "(1080p)" or "HD" for display. */
export function cleanDisplayName(name) {
  const cleaned = name.replace(QUALITY_SUFFIX_RE, '').trim();
  return cleaned || name;
}

function normalizeName(name) {
  let n = name.toLowerCase();
  n = n.replace(/\([^)]*\)/g, ''); // drop parenthetical notes
  n = n.replace(/\[[^\]]*\]/g, ''); // drop bracketed notes
  n = n.replace(QUALITY_WORD_RE, '');
  n = n.replace(/[^a-z0-9]+/g, ' ');
  return n.trim();
}

/**
 * Group raw channel entries that represent the same logical channel.
 * Channels are grouped by tvg-id when present, otherwise by normalized
 * name, so multiple stream URLs for "the same channel" become an ordered
 * fallback list (`sources`).
 */
export function groupWithFallbacks(rawChannels) {
  const byKey = new Map();
  const order = [];

  for (const ch of rawChannels) {
    const key = ch.tvgId.trim()
      ? ch.tvgId.trim().toLowerCase()
      : normalizeName(ch.name) || ch.name.toLowerCase();

    if (!byKey.has(key)) {
      byKey.set(key, {
        name: cleanDisplayName(ch.name),
        logo: ch.logo,
        group: ch.group,
        tvgId: ch.tvgId,
        sources: [ch.url],
      });
      order.push(key);
    } else {
      const existing = byKey.get(key);
      if (!existing.sources.includes(ch.url)) {
        existing.sources.push(ch.url);
      }
      if (!existing.logo && ch.logo) {
        existing.logo = ch.logo;
      }
    }
  }

  return order.map((k) => byKey.get(k));
}

/** Full pipeline: raw M3U text -> grouped channel list + category list. */
export function parseAndGroup(text, defaultGroup = '') {
  const raw = parseM3U(text, defaultGroup);
  const grouped = groupWithFallbacks(raw);
  const categories = Array.from(
    new Set(grouped.map((g) => g.group || 'Uncategorized'))
  ).sort();
  return { channels: grouped, categories, total: grouped.length };
}
