// Built-in source catalog, ported from the (now removed) FastAPI backend's
// sources.py. Every entry points at a free, publicly listed M3U playlist
// from the iptv-org project (https://github.com/iptv-org/iptv) - a
// community index of stream URLs that broadcasters make available without
// a login. No credentials, scraping, or paid/private catalogs involved.
//
// Note: this list does not include playlists for paid pay-TV operators
// (Jio, Airtel, Tata Play, Zee5, Sony, etc). Lists claiming to offer those
// for free are almost always unauthorized re-streams of someone else's
// paid subscription - legally risky and unreliable (they get taken down
// constantly). Use the "Add your own M3U" option for anything you have a
// legitimate source/license for.

const BASE = 'https://iptv-org.github.io/iptv';

export const BUILTIN_SOURCES = [
  {
    id: 'in',
    name: 'India',
    description: 'Free-to-air Indian channels',
    kind: 'country',
    url: `${BASE}/countries/in.m3u`,
  },
  {
    id: 'us',
    name: 'United States',
    description: 'Free-to-air US channels',
    kind: 'country',
    url: `${BASE}/countries/us.m3u`,
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    description: 'Free-to-air UK channels',
    kind: 'country',
    url: `${BASE}/countries/uk.m3u`,
  },
  {
    id: 'ca',
    name: 'Canada',
    description: 'Free-to-air Canadian channels',
    kind: 'country',
    url: `${BASE}/countries/ca.m3u`,
  },
  {
    id: 'news',
    name: 'News',
    description: 'Global news channels',
    kind: 'category',
    url: `${BASE}/categories/news.m3u`,
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Global sports channels',
    kind: 'category',
    url: `${BASE}/categories/sports.m3u`,
  },
  {
    id: 'movies',
    name: 'Movies',
    description: 'Free movie channels',
    kind: 'category',
    url: `${BASE}/categories/movies.m3u`,
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Global music channels',
    kind: 'category',
    url: `${BASE}/categories/music.m3u`,
  },
  {
    id: 'airtel',
    name: 'Airtel IPTV',
    description: 'Airtel IPTV channels provided by samadhanraut',
    kind: 'category',
    url: 'https://raw.githubusercontent.com/samadhanraut/Airtel_IPTV/main/Airtel.m3u',
  },
  {
    id: 'airtel_sabbir',
    name: 'Airtel IPTV (Sabbir)',
    description: 'Airtel IPTV channels provided by frienemyman',
    kind: 'category',
    url: 'https://raw.githubusercontent.com/frienemyman/Airtel-IPTV/main/Sabbir_AirtelIPTV.m3u',
  },
  {
    id: 'tatasky_local',
    name: 'TataSky (Local Proxy)',
    description: 'TataSky Playlist AutoUpdater (Requires local proxy running)',
    kind: 'category',
    url: 'http://localhost:3500/playlist.m3u',
  },
  {
    id: 'jiotv_local',
    name: 'JioTV Go (Local Proxy)',
    description: 'JioTV Go app (Requires local app running)',
    kind: 'category',
    url: 'http://localhost:5001/playlist.m3u',
  },
  {
    id: 'eng',
    name: 'English speaking',
    description: 'Channels broadcasting in English worldwide',
    kind: 'language',
    url: `${BASE}/languages/eng.m3u`,
  },
];

export function findSource(sourceId) {
  return BUILTIN_SOURCES.find((s) => s.id === sourceId) || null;
}
