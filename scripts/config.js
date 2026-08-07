'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Frontend Runtime Config
//
// Single place to change the backend API origin. Loaded before every other
// script (see index.html), so window.PET_FRIENDS_CONFIG is available to
// app.js and every scripts/data/*.js data source.
//
// The backend origin is picked automatically from where this page is
// being served, so no manual edit is needed to switch between modes:
//   - localhost / 127.0.0.1 (local dev server, Live Server, ...)
//       → local backend (npm run server / npm run dev:server)
//   - any other hostname (a deployed/public frontend)
//       → the deployed Render backend
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const LOCAL_API_BASE_URL = 'http://localhost:3000';
const CLOUD_API_BASE_URL = 'https://pet-friends-api.onrender.com';

const API_BASE_URL = LOCAL_HOSTNAMES.has(window.location.hostname)
    ? LOCAL_API_BASE_URL
    : CLOUD_API_BASE_URL;

window.PET_FRIENDS_CONFIG = {
    API_BASE_URL,
};
