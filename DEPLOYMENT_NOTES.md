# Deployment Notes

Status: **not deployed**. This document tracks what's already prepared for a
future cloud deployment and what still needs to happen at that time.

## Environment variables (see `.env.example`)

| Variable | Purpose | Local default |
|---|---|---|
| `PORT` | Backend listen port | `3000` |
| `NODE_ENV` | `development` \| `production` — gates production-only behavior (see below) | `development` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection | local MySQL |
| `DB_SSL` | `true` to enable TLS to MySQL (cloud providers may require it) | `false` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins | falls back to `http://127.0.0.1:5500, http://localhost:5500` if unset |
| `JWT_SECRET` | Signs auth tokens — **must** be a real secret in production | placeholder in `.env.example` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `UPLOAD_PROVIDER` | Placeholder only — `local` is the only implemented option today | `local` |
| `UPLOAD_DIR` | Where uploaded photos are written | `server/uploads/listings` |

## What changes in production (`NODE_ENV=production`)

- Server refuses to start if `JWT_SECRET` is still the `change_me` placeholder.
- Server warns on startup if `CORS_ORIGIN` or `DB_PASSWORD` aren't set.
- The backend optionally serves the static frontend (`index.html`, `app.js`,
  `styles.css`, `scripts/`, `assets/`) — only those specific files/folders,
  never the whole project root. The frontend can also be deployed separately
  (static hosting/CDN) instead; nothing else depends on this.

## Frontend API base URL

`scripts/config.js` sets `window.PET_FRIENDS_CONFIG.API_BASE_URL`, loaded
before every other script. All `scripts/data/*.js` files and `app.js` read
from it (falling back to `http://localhost:3000` if the file is missing).
To point the frontend at a deployed backend, change the one value in that
file — no other frontend file needs to change.

## Still needed before an actual deployment (out of scope for this milestone)

- Provision cloud MySQL, run `server/sql/init.sql` + `server/sql/migrations/*`
  against it, set `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`/`DB_SSL`.
- Set a real `JWT_SECRET` and `CORS_ORIGIN` in the production environment.
- Decide where the frontend is actually hosted and set `API_BASE_URL`
  accordingly in `scripts/config.js` (or generate it per-environment).
- Local disk uploads (`server/uploads/listings/`) don't survive most cloud
  deployments (ephemeral filesystems, multiple instances) — migrating to
  external storage (e.g. Cloudinary) is a separate future milestone.
