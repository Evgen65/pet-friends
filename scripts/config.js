'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Frontend Runtime Config
//
// Single place to change the backend API origin. Loaded before every other
// script (see index.html), so window.PET_FRIENDS_CONFIG is available to
// app.js and every scripts/data/*.js data source.
//
// Local development: leave this pointing at the local backend
// (npm run server / npm run dev:server). For a future cloud deployment,
// change API_BASE_URL to the deployed backend's URL — no other frontend
// file needs to change.
// ─────────────────────────────────────────────────────────────────────────────

window.PET_FRIENDS_CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
};
