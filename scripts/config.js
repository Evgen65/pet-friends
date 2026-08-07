'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Frontend Runtime Config
//
// Single place to change the backend API origin. Loaded before every other
// script (see index.html), so window.PET_FRIENDS_CONFIG is available to
// app.js and every scripts/data/*.js data source.
//
// Local development (default): leave this pointing at the local backend
// (npm run server / npm run dev:server).
//
// Cloud API testing: comment out the local line below and uncomment the
// cloud one instead — no other frontend file needs to change.
//   API_BASE_URL: "https://pet-friends-api.onrender.com"
// ─────────────────────────────────────────────────────────────────────────────

window.PET_FRIENDS_CONFIG = {
     API_BASE_URL: 'http://localhost:3000',
   // API_BASE_URL: 'https://pet-friends-api.onrender.com',
};
