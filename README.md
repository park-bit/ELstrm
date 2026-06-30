# ELstrm

An Android TV / browser IPTV player built on free, publicly listed playlists
(via [iptv-org](https://github.com/iptv-org/iptv)) or any M3U URL you add
yourself. React 19 + Vite frontend, FastAPI backend, packaged for Android TV
with Capacitor.

## What it does

- Browse channels from a few built-in free sources (by country/category/language)
  or paste your own M3U/M3U8 playlist URL.
- Per-channel **mirror fallback**: when a playlist lists the same channel
  more than once (common with community playlists), those entries are
  merged into one channel with an ordered list of source URLs. If playback
  on the first source fails, the player automatically tries the next one.
- Favorites, search, and "continue watching" — all stored locally in the
  browser (`localStorage`), no account required.
- Full D-pad / keyboard navigation across the source picker, category
  sidebar, and channel grid, with wraparound at grid edges.

## Why there's a backend

Browsers block cross-origin requests to most third-party stream hosts
(CORS). The FastAPI backend fetches and parses playlists server-side and
hands the frontend clean JSON, so this isn't a problem. It also exposes a
small probe endpoint for checking whether a stream URL is currently
reachable.

## Project layout

```
backend/        FastAPI app (playlist proxy/parser, source catalog, stream probe)
src/            React frontend
  components/   UI components (source picker, channel browser, player, etc.)
  hooks/        useGridNavigation - D-pad/keyboard grid navigation
  utils/        API client, localStorage persistence, shared filter logic
android/        Capacitor Android project
```

## Running locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

Runs on `http://localhost:8000` by default. Optional env var:

- `CORS_ALLOW_ORIGINS` - comma-separated list of allowed origins for
  production deployments. Defaults to `*` (safe here since the API sends
  no cookies/credentials).

### Frontend

```bash
npm install
cp .env.example .env.local   # adjust VITE_API_BASE_URL if needed
npm run dev
```

By default the frontend expects the backend at `http://localhost:8000`.
Set `VITE_API_BASE_URL` in `.env.local` to point elsewhere (e.g. a backend
deployed on Render).

### Android (Capacitor)

```bash
npm run build
npx cap sync android
npx cap open android
```

## Adding your own sources

Built-in sources are free, publicly listed playlists from iptv-org
(`backend/sources.py`). You're not limited to those: use the **"Add your
own M3U"** card in the Sources screen to add any playlist URL you trust.
Custom sources are saved in your browser and persist across sessions.

A note on sourcing: this project intentionally does not bundle playlists
for paid pay-TV operators (Jio, Airtel, Tata Play, Zee5, Sony, etc.).
Lists claiming to offer those for free are almost always unauthorized
re-streams of someone else's paid subscription, which is both legally
risky and unreliable (they get taken down constantly). If you have a
legitimate source for something, add it via the custom URL field.

## Known limitations

- No EPG (program guide) - channel metadata is whatever the playlist provides.
- The in-memory playlist/probe caches are per-process; they reset on backend restart.
- The frontend JS bundle is unsplit (~717 KB minified); fine for a TV app
  shell but worth code-splitting if this grows further.
