# BACKEND_PLAN.md — Pet Friends

> Architecture plan for backend integration.
> The current frontend must remain fully functional throughout all phases.
> This project is used as a realistic QA training environment for students.

---

## Backend Milestone 1 — Completed

| Item | Status |
|------|--------|
| Express server skeleton (`server/server.js`) | Done |
| MySQL connection pool (`server/db/connection.js`) | Done |
| `GET /api/health` | Done |
| `GET /api/health/db` | Done |
| Listings route placeholder (`GET /api/listings`) | Done |
| Frontend still uses localStorage | Unchanged |

**Packages added**: `express`, `mysql2`, `dotenv`, `cors` (dependencies); `nodemon` (devDependency).

**Run**: `npm run server` or `npm run dev:server`

---

## Current State

The application is a pure client-side single-page app:

- **HTML**: `index.html` — all markup, 7 sections, all forms
- **CSS**: `styles.css` — all styling, CSS custom properties, responsive layout
- **JavaScript**: `app.js` — all logic, localStorage CRUD, rendering, validation, i18n, seed data
- **No backend, no server, no npm packages used at runtime**
- All data persists in `localStorage` in the user's browser

The only npm dependency is `playwright` (dev/testing tool, not used at runtime).

---

## Why MySQL (Not SQLite)

This project is designed as a **realistic QA training environment**. SQLite is a good embedded database for quick prototypes, but it is not representative of what QA students will encounter in real-world projects.

MySQL is chosen for the following reasons:

| Reason | Explanation |
|--------|-------------|
| **Realistic database server** | MySQL runs as a separate server process, just like in production. Students practice connecting to it, not just reading a file. |
| **SQL practice** | Students write and run SQL queries in MySQL Workbench — `SELECT`, `INSERT`, `UPDATE`, `DELETE`, joins, filtering. |
| **UI / API / DB triangle verification** | QA can verify the same data from three angles: what the UI shows, what the API returns (Postman), and what is stored in MySQL. |
| **Postman + DB testing** | Students send API requests in Postman and immediately verify the result in MySQL Workbench. This is a core QA skill. |
| **Test data preparation** | Students prepare test data by running `INSERT` statements directly in MySQL Workbench, then verify how the UI and API handle it. |
| **Negative testing** | Students can insert malformed or edge-case data directly in MySQL to test how the API and UI respond. |
| **Industry standard** | MySQL is one of the most widely used relational databases. Familiarity with it translates directly to real-world QA work. |

> SQLite is not used at any stage of this project, including local development.

---

## Proposed Architecture

### Frontend (unchanged until Phase 3)

- Plain HTML/CSS/JavaScript — no framework, no bundler
- Continues to use `localStorage` as primary data source through Phase 2
- Begins reading from API in Phase 3 (Found Pets section only)

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **Entry point**: `server/index.js` (to be created in a future milestone)
- **Port**: 3000 (configurable via environment variable)

### Database

| Environment    | Database | Recommended client       | Reason                                          |
|----------------|----------|--------------------------|-------------------------------------------------|
| Local dev      | MySQL    | MySQL Workbench          | Free, widely documented, good for QA training   |
| Production     | MySQL    | MySQL Workbench / cloud console | Same schema, same engine — no migration needed |

MySQL is used in all environments. There is no SQLite fallback.

> **Client tool policy**: MySQL Workbench is the recommended client for QA exercises because it is free and widely documented. The project has no technical dependency on it — any MySQL-compatible client works: DBeaver, TablePlus, DataGrip, HeidiSQL, or the `mysql` CLI. SQL examples in this document and in `DATABASE_SCHEMA.md` use standard SQL that runs in any client.

---

## QA Training Angle

Each phase of the backend integration provides specific QA training opportunities:

### UI Testing
- Verify that forms submit data correctly and that new listings appear in the UI
- Check that editing and deleting listings reflects immediately
- Test validation messages for missing required fields
- Test with different browsers and languages (en, ru, he)

### API Testing (Postman)
- Send `GET`, `POST`, `PUT`, `DELETE` requests for each endpoint
- Verify response structure, status codes, and field values
- Test error cases: missing fields, invalid enum values, non-existent IDs
- Test pagination parameters (`limit`, `offset`)

### DB Validation (MySQL client)
- After a POST request, confirm the row exists in the `listings` table
- After a DELETE request, confirm the row is gone
- After a PUT request, check that `updated_at` changed and fields match
- Compare timestamps between API response and DB values

### Test Data Setup
- Insert seed data directly via SQL `INSERT` statements
- Create listings in specific states (`open`, `resolved`, `available`, etc.)
- Prepare edge-case data: very long text, special characters, Hebrew and Russian text

### Negative Testing
- Insert a row with an invalid `scenario` value directly in MySQL; check how the API handles it
- Send a POST request with a missing required field; verify 400 response
- Request a non-existent listing ID; verify 404 response
- Send invalid email format; verify validation error

### CRUD Verification
- Create a listing (POST) → verify in UI and DB
- Read it (GET) → verify fields match
- Update it (PUT) → verify in UI and DB that `updated_at` changed
- Delete it (DELETE) → verify it is gone from UI, API, and DB

### SQL Practice
- Query all open lost pets: `SELECT * FROM listings WHERE scenario = 'lost' AND status = 'open';`
- Count listings by scenario: `SELECT scenario, COUNT(*) FROM listings GROUP BY scenario;`
- Find listings by city: `SELECT * FROM listings WHERE city = 'Austin';`
- Find recently added listings: `SELECT * FROM listings ORDER BY created_at DESC LIMIT 10;`

---

## Transition Stages

### Phase 1 — Current (localStorage only)

- Frontend is the source of truth.
- No backend exists.
- All CRUD operations go through `localStorage` via `load()` / `save()` in `app.js`.
- `localStorage` keys: `pf_found`, `pf_lost`, `pf_forHome`, `pf_adopt`, `pf_stories`, `pf_seeded`, `petFriendsLanguage`, `pf_i18n_v1`, `pf_photo_v2`.

**QA focus**: Manual UI testing, checking localStorage state in browser DevTools.

### Phase 2 — Backend scaffolding (API exists, frontend still uses localStorage)

- Backend project is created (`server/` directory).
- Express server starts with a single health endpoint: `GET /api/health`.
- No database yet — health endpoint returns a static JSON response.
- Frontend is **not changed** in this phase.
- Goal: verify the server starts, responds, and can be tested with Postman.

**QA focus**: First Postman test — send GET /api/health, verify 200 OK and JSON body.

### Phase 3 — MySQL schema and read-only listings API

- MySQL database `pet_friends` is created (see `DATABASE_SCHEMA.md`).
- `listings` table is created.
- Seed data is imported via SQL INSERT statements.
- `GET /api/listings` and `GET /api/listings/:id` are implemented.
- Frontend is **not changed yet** — localStorage remains the source of truth.
- Goal: verify queries return correct data; practice reading from MySQL Workbench.

**QA focus**: Compare Postman response with MySQL Workbench query results. Verify seed data is consistent between DB and API.

### Phase 4 — Connect Found Pets section to API (pilot)

- Found Pets section (`pf_found`) is updated to read and write via API.
- `POST /api/listings`, `PUT /api/listings/:id`, `DELETE /api/listings/:id` are implemented for Found Pets.
- The `scenario` field is set to `found` for all Found Pets listings.
- Other three listing sections (Lost, For Home, Adopt) still use `localStorage`.
- Photo upload is **not** changed in this phase. Listings with Base64 photos remain in localStorage only. When a listing with a Base64 photo is moved to the server, the user must re-upload the photo as a file separately. The Base64 data string is never sent to or stored by the backend.
- A temporary feature flag `const DATA_SOURCE = "localStorage"` is introduced (see Migration Plan).

**QA focus**: Full CRUD testing for Found Pets via Postman and UI. After each API operation, verify result in MySQL Workbench.

### Phase 5 — All four listing sections use API

- Lost Pets, Pets for Home, and I Want to Adopt are migrated from `localStorage` to the API.
- The `scenario` field distinguishes sections: `found`, `lost`, `for_home`, `adopt`.
- Pet Stories remain on `localStorage` in Phase 5. Stories are migrated in a dedicated later phase with their own `stories` table and `/api/stories` module.
- Feature flag is removed or set permanently to `"api"` for the four listing sections only.

**QA focus**: Full regression testing across all sections. SQL queries in MySQL Workbench to verify data integrity.

### Phase 6 — Server-side photo upload

- A `POST /api/photos` endpoint is added.
- Photos are stored as files on disk (or cloud storage) and referenced by URL.
- The frontend's photo handler is updated: instead of storing base64 in `localStorage`, it uploads the file and stores the returned URL.
- The base64 `{ source: "local", dataUrl: "..." }` format is replaced by `{ source: "url", url: "https://..." }`.
- Base64 photos from localStorage are not automatically migrated. When a user re-uploads a photo through the new file upload flow, the backend stores the resulting URL in `photo_url`. Listings where the photo has not been re-uploaded will have `photo_url = NULL`.

**QA focus**: Test photo upload via Postman (multipart form). Verify file appears on disk and URL is stored in MySQL.

### Phase 7 — Users and authentication

- User registration and login endpoints.
- JWT or session-based auth.
- Listings are associated with the creating user.
- Only the owner or admin can edit/delete a listing.

**QA focus**: Authorization testing — verify that unauthenticated requests are rejected, that users cannot edit others' listings.

### Phase 8 — Deploy backend and database

- Backend deployed to a cloud provider (e.g. Railway, Fly.io, Render).
- MySQL database provisioned in the cloud.
- Environment variables configured for database URL, port, upload paths.
- Frontend updated to point to the deployed API URL.

**QA focus**: Smoke testing on the deployed environment. Verify all endpoints work with the production database.

---

## Out of Scope for the First Backend Milestone (Phase 2)

| Feature                             | Reason                                                    |
|-------------------------------------|-----------------------------------------------------------|
| Authentication / JWT                | Adds complexity; not needed for read/write of public data |
| User roles (admin/user)             | Depends on auth being implemented first                   |
| Multiple photos per listing         | Current data model uses a single `photo` field            |
| Cloud image storage (S3, Cloudinary)| Requires paid accounts and additional config              |
| Automatic translation               | i18n is handled client-side                               |
| Payments / donations                | No commercial functionality planned                       |
| Push notifications                  | Out of scope for a community listing board                |

---

## Open Architecture Questions

1. **Pet Stories backend**: Resolved — stories use a separate `stories` table and a separate `/api/stories` API module. They are not part of the first backend milestone (Phases 2–5). Stories migration is planned as Phase 6.
2. **Contact form**: Currently shows a success screen with no backend call. Should a future backend store contact submissions or send email?
3. **i18n fields** (`titleI18n`, `descriptionI18n`): Resolved — not stored in the first backend version. The DB stores `pet_name_or_title`, `description`, and `content_language` as plain text. A `listing_translations` table may be added in a future phase when manual multi-language editing becomes a product feature.
4. **Photo migration**: Resolved — Base64 photos in localStorage are local-only MVP data. Automatic migration is out of scope for the first backend milestone. When a localStorage listing is moved to the server, the user must upload the photo as a file to `POST /api/photos`; the backend stores the resulting URL. Listings with no re-uploaded photo will have `photo_url = NULL`.
5. **Concurrent sessions**: The current `localStorage`-based app has a known issue with concurrent tabs (TESTING_NOTES.md L-8). The API must handle concurrent writes with proper transaction isolation.
6. **MySQL version**: Resolved — MySQL 8.0.16+ is required. CHECK constraints (used in `listings` and `stories`) are enforced only from 8.0.16. No 5.7 compatibility shims will be added unless explicitly requested.
