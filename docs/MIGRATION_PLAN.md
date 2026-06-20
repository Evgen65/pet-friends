# MIGRATION_PLAN.md — Pet Friends

> Gradual migration plan from localStorage to a MySQL-backed REST API.
> The working application must never break between phases.
> All phases are additive — no phase removes a working data path before the next one is verified.
> This plan is also a QA training roadmap: each phase introduces new testing opportunities.

---

## Core Principle

**The app must remain usable at every point in the migration.**

A user who clears their browser cache, opens the app during a migration phase, or has old localStorage data must always see a working interface. No phase introduces a state where the app is broken or shows empty data unexpectedly.

---

## Phase Overview

| Phase | Data Source                                       | What changes                                           | QA focus                              |
|-------|---------------------------------------------------|--------------------------------------------------------|---------------------------------------|
| 1     | localStorage (current)                            | Nothing — baseline                                     | Manual UI testing, DevTools           |
| 2     | localStorage                                      | Backend exists, health endpoint only                   | First Postman test                    |
| 3     | localStorage (frontend); MySQL (backend read-only)| `listings` table created, seed data loaded, GET endpoints | Postman + MySQL client comparison  |
| 4     | Found Pets → API; others → localStorage           | Pilot section fully migrated                           | Full CRUD via Postman, UI, and MySQL  |
| 5     | All 4 listing sections → API                      | Full listing migration (stories not included)          | Regression testing across all sections|
| 6     | Pet Stories → API                                 | `stories` table + `/api/stories` module created        | Stories CRUD via Postman and MySQL    |
| 7+    | localStorage only for UI prefs                    | `petFriendsLanguage` stays in localStorage             | Auth and cleanup testing              |

---

## Phase 1 — Current State (localStorage only)

No changes required. This is the documented baseline.

**localStorage keys in use:**

| Key                  | Purpose                               | Removed in phase                       |
|----------------------|---------------------------------------|----------------------------------------|
| `pf_found`           | Found Pets listings array             | 4 (Found section only)                 |
| `pf_lost`            | Lost Pets listings array              | 5                                      |
| `pf_forHome`         | Pets for Home listings array          | 5                                      |
| `pf_adopt`           | I Want to Adopt listings array        | 5                                      |
| `pf_stories`         | Pet Stories array                     | 6 (separate phase, after listing migration) |
| `pf_seeded`          | Seed data flag (`"1"`)                | 5 (no longer needed once DB is seeded) |
| `pf_i18n_v1`         | i18n upgrade flag (`"1"`)             | 5 (upgrade run once in DB migration)   |
| `pf_photo_v2`        | Photo upgrade flag (`"1"`)            | 5 (upgrade run once in DB migration)   |
| `petFriendsLanguage` | Selected UI language (`en`/`ru`/`he`) | Never — UI preference stays in localStorage |

**QA activities in Phase 1**:
- Manual UI testing: create, edit, delete listings in each section
- Open browser DevTools → Application → Local Storage to inspect data structure
- Verify the four scenarios: found, lost, for_home, adopt
- Test all three UI languages: English, Russian, Hebrew
- Run Playwright tests if configured

---

## Phase 2 — Backend scaffolding (no frontend changes)

**Frontend**: unchanged. `localStorage` is still the source of truth.

**Backend**:
- `GET /api/health` endpoint returns `{ "status": "ok", "timestamp": "..." }`.
- No database yet.
- No changes to `app.js`, `index.html`, or `styles.css`.

**Verification**: open the browser — app works exactly as before. Send a Postman request to confirm the server is running.

**QA activities in Phase 2**:

1. Send `GET http://localhost:3000/api/health` in Postman
2. Verify: status code `200`, body has `status: "ok"`, `timestamp` is a valid ISO 8601 string
3. Stop the server and resend — verify the request fails (connection refused)
4. Restart server — verify it responds again

This is the first Postman exercise: understanding what a working API response looks like.

---

## Phase 3 — MySQL schema and read-only listings API (no frontend changes)

**Frontend**: unchanged.

**Backend**:
- MySQL database `pet_friends` is created (see `DATABASE_SCHEMA.md`).
- `listings` table is created. The `stories` table is out of scope for Phase 3 — it will be created in Phase 6.
- Seed data is imported via SQL `INSERT` statements.
- `GET /api/listings` and `GET /api/listings/:id` are implemented.

**Database setup steps** (run in MySQL Workbench or any MySQL client):
```sql
CREATE DATABASE IF NOT EXISTS pet_friends
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pet_friends;

-- Then run the CREATE TABLE statements from DATABASE_SCHEMA.md
-- Then insert seed data
```

**QA activities in Phase 3**:

**MySQL client practice** (examples use MySQL Workbench; any client works):
- Connect to MySQL server (localhost, port 3306)
- Run `SELECT * FROM listings;` — verify seed data was inserted
- Run `SELECT scenario, COUNT(*) FROM listings GROUP BY scenario;` — count per section
- Run `SELECT * FROM listings WHERE scenario = 'found' AND status = 'open';`

**Postman + MySQL comparison**:
- Send `GET /api/listings?scenario=found` → note total count
- Run `SELECT COUNT(*) FROM listings WHERE scenario = 'found';` → count must match
- Pick one listing ID from the API response
- Send `GET /api/listings/<id>` → verify all fields
- Run `SELECT * FROM listings WHERE id = <id>;` → fields must match
- Compare `createdAt` in API (ISO 8601) with `created_at` in MySQL (DATETIME)

**This is the core QA triangle: UI shows X → API returns X → MySQL stores X.**

---

## Phase 4 — Found Pets section migrated to API (pilot)

This is the first phase that touches `app.js`.

### Feature flag

A temporary constant is introduced at the top of `app.js`:

```javascript
// Phase 4 temporary flag. Change to "api" to enable API mode for Found Pets.
// Other sections are not affected by this flag yet.
const DATA_SOURCE = "localStorage";
```

When `DATA_SOURCE === "api"`, the Found Pets section (`pf_found`) calls the API instead of `localStorage`. When `DATA_SOURCE === "localStorage"`, behavior is identical to today.

> **Do not implement this flag yet.** It is described here for planning purposes. Implementation begins in Phase 4.

### Data flow change for Found Pets

| Operation | Phase 1–3 (localStorage)              | Phase 4+ (API)                        |
|-----------|---------------------------------------|---------------------------------------|
| Load      | `localStorage.getItem('pf_found')`    | `GET /api/listings?scenario=found`    |
| Create    | `localStorage.setItem('pf_found', ...)` | `POST /api/listings`                |
| Update    | `localStorage.setItem('pf_found', ...)` | `PUT /api/listings/:id`             |
| Delete    | `localStorage.setItem('pf_found', ...)` | `DELETE /api/listings/:id`          |

Other sections (Lost, For Home, Adopt) remain on `localStorage` during Phase 4.

### ID change

The frontend currently generates IDs with `genId()` (base36 strings). The API returns integer IDs from MySQL `AUTO_INCREMENT`. The frontend must accept either type — existing `data-id` attributes on Edit/Delete buttons work with any string or number.

**QA activities in Phase 4**:

**CRUD verification via Postman + MySQL**:
1. Create a Found Pet listing via the UI → verify it appears in UI
2. Send `GET /api/listings?scenario=found` → listing must appear in API response
3. Check MySQL: `SELECT * FROM listings WHERE scenario = 'found' ORDER BY created_at DESC LIMIT 1;`
4. Edit the listing in the UI → verify changes in UI, Postman GET, and MySQL
5. Check that `updated_at` changed in MySQL after the edit
6. Delete the listing in the UI → verify it is gone from UI, API, and MySQL

**Negative testing**:
- Try to create a Found Pet listing with an empty title → verify UI shows validation error
- Send `POST /api/listings` with missing `title` field in Postman → verify `400` response
- Send `DELETE /api/listings/99999` in Postman → verify `404`

**Regression testing**:
- Verify Lost Pets, Pets for Home, and I Want to Adopt still work via localStorage (no regression)
- Verify language switching still works
- Verify Pet Stories still work

---

## Phase 5 — All four listing sections use API

The feature flag is extended (or a separate flag per section is used — TBD):

```javascript
const DATA_SOURCE = "api"; // applies to all four sections
```

All `pf_found`, `pf_lost`, `pf_forHome`, `pf_adopt` reads and writes go through the API.

`pf_seeded`, `pf_i18n_v1`, `pf_photo_v2` flags in localStorage are no longer checked (seed and upgrades now live in the database migration scripts). These keys may remain in old browsers; they are harmless.

Pet Stories remain on `localStorage` throughout Phase 5. Migration of stories to the backend is handled separately in Phase 6.

**QA activities in Phase 5**:

**Full regression test across all sections**:
- Create, edit, delete listings in Found, Lost, For Home, and Adopt
- Verify each operation in MySQL Workbench
- Verify data is correct in all three languages

**SQL practice in MySQL Workbench**:
```sql
-- Verify all sections have data
SELECT scenario, COUNT(*) FROM listings GROUP BY scenario;

-- Find listings created today
SELECT * FROM listings WHERE DATE(created_at) = CURDATE();

-- Find listings with no photo
SELECT id, scenario, title FROM listings WHERE photo_url IS NULL;

-- Check for any status values that don't match the expected set
SELECT DISTINCT status FROM listings;
```

---

## Phase 6 — Pet Stories backend (separate phase)

Pet Stories have a completely different field set from the four listing sections and are planned as a separate backend module. This phase begins only after Phase 5 (all listing sections on API) is stable.

**Frontend**: Pet Stories section is updated to read and write via `/api/stories`.

**Backend**:
- `stories` table is created in MySQL (see `DATABASE_SCHEMA.md` — Stories Table section).
- Full CRUD endpoints: `GET /api/stories`, `GET /api/stories/:id`, `POST /api/stories`, `PUT /api/stories/:id`, `DELETE /api/stories/:id`.
- `pf_stories` localStorage key is retired.

**QA activities in Phase 6**:
- Create, edit, delete stories via the UI — verify in Postman and MySQL
- Verify that `story_date` is set to today on every create and edit
- Verify the `category` field accepts only `funny`, `touching`, `useful`
- Run `SELECT * FROM stories ORDER BY created_at DESC;` in MySQL client after each operation
- Regression: verify the four listing sections still work correctly (no cross-contamination)

---

## Phase 7+ — localStorage retained only for UI preferences

After all data sections are migrated (listings + stories):

- `petFriendsLanguage` — remains in `localStorage` (language preference is per-browser, not per-account).
- All listing and story data — served by the MySQL API (listings from Phase 5, stories from Phase 6).
- `pf_*` keys — deprecated; can be cleared from localStorage on first API-mode load (optional cleanup step).

**QA activities**:
- Verify that switching the UI language does not trigger any API calls
- Verify that `petFriendsLanguage` is still read from localStorage
- Clear all `pf_*` keys manually in DevTools → verify the app still works (data comes from API)

---

## Field Mapping Table

### Listing fields

| localStorage field   | API JSON field    | MySQL column         | Notes                                                       |
|----------------------|-------------------|----------------------|-------------------------------------------------------------|
| *(key name)*         | `scenario`        | `scenario`           | Not in localStorage; derived from array key (`pf_found` → `found`) |
| `id`                 | `id`              | `id`                 | Type changes: base36 string → MySQL AUTO_INCREMENT integer  |
| `type`               | `petType`         | `pet_type`           | Value casing: `"Cat"` → `"cat"` (lowercase in DB/API)       |
| `title`              | `petNameOrTitle`  | `pet_name_or_title`  | Renamed; plain text in user's chosen language               |
| `city`               | `city`            | `city`               | Same value                                                  |
| `date`               | `eventDate`       | `event_date`         | Renamed; MySQL DATE type, format `YYYY-MM-DD`               |
| `description`        | `description`     | `description`        | Same value                                                  |
| `email`              | `contactEmail`    | `contact_email`      | Renamed for clarity                                         |
| `phone`              | `contactPhone`    | `contact_phone`      | Renamed for clarity                                         |
| `status`             | `status`          | `status`             | Value casing: `"Open"` → `"open"` (lowercase in DB/API)     |
| `contentLanguage`    | `contentLanguage` | `content_language`   | Same value; may be absent in old records (default `"en"`)   |
| `photo` (object)     | `photoUrl` (string or null) | `photo_url` | Photo object flattened to URL (never base64 in DB)       |
| `createdAt` (ms int) | `createdAt` (ISO 8601) | `created_at` (DATETIME) | MySQL stores DATETIME; API returns ISO 8601 string    |
| *(absent)*           | `updatedAt`       | `updated_at`         | New field; set automatically by MySQL on UPDATE             |
| `titleI18n` (object) | *(not stored)*    | *(not stored)*       | Client-side seed data only; not migrated in first backend version |
| `descriptionI18n` (object) | *(not stored)* | *(not stored)*    | Same as above; future `listing_translations` table if needed |

### Stories fields

| localStorage field    | API JSON field | MySQL column    | Notes                                        |
|-----------------------|----------------|-----------------|----------------------------------------------|
| `id`                  | `id`           | `id`            | Same type change as listings                 |
| `title`               | `title`        | `title`         | Same value                                   |
| `category`            | `category`     | `category`      | Value casing: `"Funny"` → `"funny"` (lowercase) |
| `text`                | `text`         | `text`          | Same value                                   |
| `mediaUrl`            | `mediaUrl`     | `media_url`     | Same value; any string; no URL validation    |
| `date`                | `storyDate`    | `story_date`    | Renamed; set to today on every create/edit   |
| `createdAt` (ms int)  | `createdAt` (ISO 8601) | `created_at` | Type changed                           |
| *(absent)*            | `updatedAt`    | `updated_at`    | New field; auto-set by MySQL on UPDATE       |

---

## Handling Old Data Without Specific Fields

### Records without `photo`

Old records will have `photo: null`. In MySQL, `photo_url` is nullable. The API returns `"photoUrl": null`. The frontend already handles this — `getPhotoSource()` falls back to the placeholder SVG when `photo` is null.

**No action required.** The null case is already handled in the current code.

### Records without `contentLanguage`

Records seeded before the `contentLanguage` form field was added do not have this field. The frontend handles this with `item.contentLanguage ?? 'en'`.

**MySQL action**: the `content_language` column has `DEFAULT 'en'`. During import of old localStorage data, records with a missing `contentLanguage` are inserted with `content_language = 'en'`.

### Records without `breed`

`breed` does not exist in the current data model (see DATABASE_SCHEMA.md contradiction C-1). No action required — the column does not exist yet.

---

## Photo Migration Strategy

### localStorage photo formats

Current localStorage photos exist in two formats:

**Format A — user-uploaded Base64 (local-only MVP data):**
```json
{ "source": "local", "dataUrl": "data:image/webp;base64,...", "fileName": "cat.jpg", "mimeType": "image/webp" }
```

**Format B — seeded asset URL:**
```json
{ "source": "asset", "url": "assets/images/found-sample.webp" }
```

### Decision: no automatic Base64 migration

Base64 photos are local-only MVP data. Automatic migration of Base64 photos to the backend is out of scope for the first backend milestone. There is no `POST /api/photos/base64` endpoint.

### When a localStorage listing is moved to the server

- **Format B (asset URL)**: the URL is stored directly in `photo_url` (converting to an absolute server URL if needed, e.g., `http://localhost:3000/assets/images/found-sample.webp`).

- **Format A (Base64)**: the user must upload the photo as a file to `POST /api/photos`. The backend saves the file and returns a `photoUrl`. Only that URL is stored in the `photo_url` column. The Base64 data string is never sent to or stored by the backend.

Listings with a Base64 photo that have not been re-uploaded will have `photo_url = NULL` in the database. The frontend already handles this gracefully — `getPhotoSource()` falls back to the placeholder SVG when `photo` is null.

---

## Recommended Feature Flag Location

The flag will be declared at the top of `app.js`, before all function definitions:

```javascript
// Temporary data source flag for backend migration.
// "localStorage" = current behavior (default)
// "api"          = use backend API instead of localStorage
// Sections to migrate are gated individually inside each setupListingSection() call.
const DATA_SOURCE = "localStorage";
```

Each listing section will check:

```javascript
if (DATA_SOURCE === "api") {
    // ... fetch from /api/listings?scenario=found
} else {
    // ... read from localStorage (existing code, unchanged)
}
```

**Do not implement this flag yet.** Implementation starts in Phase 4.

---

## Rollback Plan

If the API integration in Phase 4 causes problems:

1. Change `const DATA_SOURCE = "api"` back to `"localStorage"` in `app.js`.
2. Redeploy the frontend (or refresh for local dev).
3. The Found Pets section reverts to localStorage immediately.
4. Data entered via the API during the pilot phase is not visible in localStorage mode.

This is why Phase 4 is a pilot on Found Pets only — the risk of data loss or regression is contained to one section.

---

## QA Skills Developed Across All Phases

| Skill | Phase |
|-------|-------|
| Manual UI testing | 1, all |
| Browser DevTools inspection (localStorage) | 1 |
| Postman — GET request, reading response | 2 |
| MySQL client — connecting, running SELECT (MySQL Workbench recommended) | 3 |
| Postman — filtering with query params | 3 |
| UI / API / DB triangle verification | 3, 4, 5 |
| Postman — POST with JSON body | 4 |
| Postman — PUT (full update) | 4 |
| Postman — DELETE and verify 204 | 4 |
| SQL — INSERT test data | 3 |
| SQL — SELECT with WHERE and ORDER BY | 3, 4, 5 |
| SQL — COUNT and GROUP BY for verification | 5 |
| Negative API testing (400, 404 responses) | 4, 5 |
| Regression testing after new feature | 4, 5 |
| Testing with multilingual data (en, ru, he) | all |
| Verifying `updated_at` after PUT | 4, 5 |
| Test data preparation via SQL INSERT | 3, 4, 5 |

---

## Open Questions

| # | Question | Impact |
|---|----------|--------|
| Q-1 | Should the feature flag be per-section (4 separate flags) or a single global flag? | Per-section is safer for phased rollout but more code |
| Q-2 | What happens to existing localStorage data after full migration to API? Should the app offer a one-time "Import my saved data" option? | UX decision — required if users have data they care about |
| Q-3 | Should the contact form post to a backend endpoint (store submissions, send email), or remain a UI-only success screen? | Separate backend feature |
| Q-4 | ~~Should Pet Stories migrate with Phase 5?~~ **Resolved**: Pet Stories are a separate backend module. The `stories` table and `/api/stories` endpoints are created in Phase 6, after all four listing sections are stable on the API. | Closed |
| Q-5 | When Phase 5 is complete, should old `pf_*` localStorage keys be cleared automatically? | Risk: users on slow rollout may lose locally stored data |
| Q-6 | ~~Which MySQL version is required?~~ **Resolved**: MySQL 8.0.16+ required. CHECK constraints enforced from 8.0.16. No 5.7 compatibility. | Closed |
| Q-7 | ~~Should MySQL Workbench be required?~~ **Resolved**: MySQL Workbench is recommended and documented, but not required. Any MySQL-compatible client is acceptable (DBeaver, TablePlus, DataGrip, HeidiSQL, `mysql` CLI). | Closed |
