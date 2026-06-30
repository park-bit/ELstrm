# ELstrm

An Android TV / browser IPTV player built on free, publicly listed playlists
(via [iptv-org](https://github.com/iptv-org/iptv)) or any M3U URL you add
yourself. Single React 19 + Vite app, packaged for Android with Capacitor.
**No separate server to run** - everything (fetching and parsing playlists,
probing stream URLs, playback) happens on-device.

## What it does

- Browse channels from a few built-in free sources (by country/category/language)
  or paste your own M3U/M3U8 playlist URL.
- Per-channel **mirror fallback**: when a playlist lists the same channel
  more than once (common with community playlists), those entries are
  merged into one channel with an ordered list of source URLs. If playback
  on the first source fails - dead link, blocked, whatever - the player
  automatically tries the next one.
- Favorites, search, and "continue watching" - all stored locally on-device
  (`localStorage`), no account required.
- Full D-pad / keyboard navigation across the source picker, category
  sidebar, and channel grid, with wraparound at grid edges.

## Architecture: why there's no backend

Earlier versions of this project had a FastAPI backend whose only job was
fetching and parsing M3U playlists server-side, to dodge CORS restrictions
in a browser. That assumption was wrong for how this app actually runs:
packaged as a Capacitor APK on a single device, "CORS" means something
different than it does on a website.

- **Playlist fetching** (`src/utils/api.js`) uses `CapacitorHttp` from
  `@capacitor/core` on native platforms. `CapacitorHttp` issues requests
  through the OS's native networking stack, not the webview's browser
  engine, so it isn't subject to the webview's CORS policy at all. No
  proxy needed.
- **Video playback** (`hls.js`, inside `VideoPlayer.jsx`) still runs
  through the webview's real browser engine (Media Source Extensions),
  which *does* enforce CORS like any browser - this is unavoidable and
  has nothing to do with having a backend. (We deliberately do **not**
  enable Capacitor's global `fetch`/`XMLHttpRequest` patching - doing so
  breaks hls.js's segment URL resolution; see
  [video-dev/hls.js#6755](https://github.com/video-dev/hls.js/issues/6755).)
  Some IPTV stream hosts send permissive CORS headers and some don't -
  that's a property of each stream, not something an app can fix. This is
  exactly what the per-channel fallback chain is for: if one mirror is
  blocked or dead, the player automatically tries the next one.
- In a plain browser tab (`npm run dev`, testing outside the packaged
  app), playlist fetching falls back to normal `fetch()`, which *is*
  subject to CORS like any website - that's an inherent limitation of
  browser testing, not a bug.

The practical result: build and install the APK, and the app works on its
own. No `localhost:8000`, no second process, no "could not reach the
backend" error.

## Project layout

```
src/
  components/   UI components (source picker, channel browser, player, etc.)
  hooks/        useGridNavigation - D-pad/keyboard grid navigation
  utils/
    api.js          On-device playlist fetch (CapacitorHttp / fetch fallback)
    m3uParser.js     M3U parsing + per-channel mirror grouping
    sources.js       Built-in free source catalog
    ttlCache.js      Small in-memory cache so repeat loads are instant
    storage.js       localStorage persistence (favorites, last watched, custom sources)
    channelFilters.js  Shared category/search/favorites filtering logic
android/        Capacitor Android project
```

## Running locally

```bash
npm install
npm run dev
```

This runs the app as a website in your browser for quick iteration. Note:
playlist fetching here uses plain `fetch()`, so you may hit real CORS
errors against sources that don't send permissive headers - that's a
browser limitation, not present once the app is actually installed as an
APK (see Architecture above).

## Building the Android APK

```bash
npm run build
npx cap sync android
npx cap open android   # opens Android Studio, or build a release APK directly:
```

Or use the GitHub Actions workflow (`.github/workflows/build.yml`), which
builds, signs, and uploads a release APK automatically on push.

## Adding your own sources

Built-in sources are free, publicly listed playlists from iptv-org
(`src/utils/sources.js`). You're not limited to those: use the **"Add your
own M3U"** card in the Sources screen to add any playlist URL you trust.
Custom sources are saved on-device and persist across sessions.

A note on sourcing: this project intentionally does not bundle playlists
for paid pay-TV operators (Jio, Airtel, Tata Play, Zee5, Sony, etc.).
Lists claiming to offer those for free are almost always unauthorized
re-streams of someone else's paid subscription, which is both legally
risky and unreliable (they get taken down constantly). If you have a
legitimate source for something, add it via the custom URL field.

## Known limitations

- No EPG (program guide) - channel metadata is whatever the playlist provides.
- The in-memory playlist/probe caches reset when the app process restarts.
- Some IPTV stream hosts block CORS for video playback specifically;
  the per-channel mirror fallback is the mitigation, not a guarantee
  every single source will play.
- The frontend JS bundle is unsplit (~729 KB minified); fine for a TV app
  shell but worth code-splitting if this grows further.
