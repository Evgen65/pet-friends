# DATABASE_SCHEMA.md — Pet Friends

> MySQL database schema for the Pet Friends backend.
> Database engine: MySQL 8.0.16+
> CHECK constraints require MySQL 8.0.16+; no 5.7 compatibility shims are used.
> All field names, types, and values are derived from `app.js` and `index.html`.
> Fields marked **TBD** are uncertain or not yet present in the frontend code.

---

## Source of Truth

All fields below were verified against the current codebase:

- `app.js`: `LISTING_FIELDS`, `SECTION_STATUSES`, `seedSampleData()`, `setupListingSection()`, `setupStoriesSection()`
- `index.html`: all `<form>` inputs and `<select>` options
- `AGENTS.md`: data model table

---

## Database Setup

Requires MySQL 8.0.16 or higher. CHECK constraints added in MySQL 8.0.16 are used throughout the schema.

> **Client tool**: MySQL Workbench is recommended for QA exercises (free, widely documented). Any MySQL-compatible client works: DBeaver, TablePlus, DataGrip, HeidiSQL, or the `mysql` CLI. All SQL in this document is standard and client-agnostic.

```sql
CREATE DATABASE IF NOT EXISTS pet_friends
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pet_friends;
```

### Why utf8mb4

`utf8mb4` is MySQL's full Unicode encoding. It is required to support:

- **English** — ASCII subset of UTF-8
- **Russian** — Cyrillic characters (2 bytes each in UTF-8)
- **Hebrew** — Hebrew characters (2–3 bytes each in UTF-8)
- **Emoji** — 4 bytes each; not supported by MySQL's older `utf8` type

`utf8mb4_unicode_ci` provides case-insensitive, accent-insensitive comparison that works correctly across all three languages.

---

## The Four Listing Scenarios

The four main sections share an identical field set and differ only in:

| Section name (frontend) | Internal `scenario` value | Status values           | Semantic meaning of `event_date` | Semantic meaning of `title` |
|-------------------------|---------------------------|-------------------------|----------------------------------|-----------------------------|
| Found Pets              | `found`                   | `open`, `resolved`      | Date the pet was found           | Pet name / descriptive title |
| Lost Pets               | `lost`                    | `open`, `resolved`      | Date the pet went missing        | Pet name                    |
| Pets for Home           | `for_home`                | `available`, `adopted`  | Date the listing was posted      | Pet name                    |
| I Want to Adopt         | `adopt`                   | `open`, `matched`       | Date the request was posted      | Request title               |

> **Note on casing**: the frontend stores status values with a capital first letter (`Open`, `Resolved`, `Available`, `Adopted`, `Matched`). The database schema uses lowercase for all internal values. A mapping layer is required during migration.

---

## Main Table: `listings`

All four scenarios (`found`, `lost`, `for_home`, `adopt`) are stored in a single `listings` table. The `scenario` column identifies which section each row belongs to.

```sql
CREATE TABLE listings (
    id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    scenario         VARCHAR(20)     NOT NULL,
    pet_type         VARCHAR(20)     NOT NULL,
    pet_name_or_title VARCHAR(255)    NOT NULL,
    city             VARCHAR(100)    NOT NULL,
    event_date       DATE            NOT NULL,
    description      TEXT            NOT NULL,
    contact_email    VARCHAR(255)    NULL,
    contact_phone    VARCHAR(50)     NULL,
    status           VARCHAR(20)     NOT NULL,
    content_language VARCHAR(5)      NOT NULL DEFAULT 'en',
    photo_url        VARCHAR(500)    NULL,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME        NULL     ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_scenario
        CHECK (scenario IN ('found', 'lost', 'for_home', 'adopt')),

    CONSTRAINT chk_pet_type
        CHECK (pet_type IN ('cat', 'dog', 'bird', 'other')),

    CONSTRAINT chk_status
        CHECK (status IN ('open', 'resolved', 'available', 'adopted', 'matched')),

    CONSTRAINT chk_content_language
        CHECK (content_language IN ('en', 'ru', 'he'))

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

### Field Reference

| Field              | MySQL Type      | Required | Example                       | localStorage field    | Notes                                                                                                 |
|--------------------|-----------------|----------|-------------------------------|-----------------------|-------------------------------------------------------------------------------------------------------|
| `id`               | INT UNSIGNED    | Yes      | `42`                          | `id` (base36 string) | Auto-increment integer. Frontend uses `genId()` (base36). Backend switches to auto-increment.         |
| `scenario`         | VARCHAR(20)     | Yes      | `'found'`                     | *(derived)*           | Values: `found`, `lost`, `for_home`, `adopt`. Not stored in localStorage — implied by array key name. |
| `pet_type`         | VARCHAR(20)     | Yes      | `'cat'`                       | `type`                | Stored lowercase in DB. Frontend stores `Cat`, `Dog`, `Bird`, `Other`.                                |
| `pet_name_or_title`| VARCHAR(255)    | Yes      | `'Orange tabby cat'`          | `title`               | Column name reflects that semantic meaning varies by scenario (pet name, request title, etc.). Plain text in the user's chosen language; no JSON. |
| `city`             | VARCHAR(100)    | Yes      | `'Austin'`                    | `city`                | Free-text, user-entered.                                                                              |
| `event_date`       | DATE            | Yes      | `'2026-06-14'`                | `date`                | MySQL DATE type (`YYYY-MM-DD`). Frontend stores as string in the same format.                         |
| `description`      | TEXT            | Yes      | `'Found near Central Park…'`  | `description`         | Free-text, no length limit enforced in current frontend.                                              |
| `contact_email`    | VARCHAR(255)    | No       | `'finder@example.com'`        | `email`               | Optional. Basic format validated client-side. Server-side validation recommended.                     |
| `contact_phone`    | VARCHAR(50)     | No       | `'555-0101'`                  | `phone`               | Optional. No format validation (known limitation L-4).                                                |
| `status`           | VARCHAR(20)     | Yes      | `'open'`                      | `status`              | Allowed values depend on scenario. See Status Enum below.                                             |
| `content_language` | VARCHAR(5)      | Yes      | `'en'`                        | `contentLanguage`     | Values: `en`, `ru`, `he`. Defaults to `en`.                                                           |
| `photo_url`        | VARCHAR(500)    | No       | `'/uploads/abc123.webp'`      | `photo` (object)      | File path or URL only. Never base64. See Photo Storage section.                                       |
| `created_at`       | DATETIME        | Yes      | `'2026-06-14 08:00:00'`       | `createdAt` (ms)      | Set automatically by MySQL on INSERT.                                                                 |
| `updated_at`       | DATETIME        | No       | `'2026-06-15 10:45:00'`       | *(absent)*            | Set automatically by MySQL on every UPDATE. NULL on first insert.                                     |

---

### Status Enum Values

| Scenario   | Frontend value  | DB value    | Meaning                            |
|------------|-----------------|-------------|------------------------------------|
| `found`    | `Open`          | `open`      | Pet not yet reunited with owner    |
| `found`    | `Resolved`      | `resolved`  | Pet returned to owner              |
| `lost`     | `Open`          | `open`      | Pet still missing                  |
| `lost`     | `Resolved`      | `resolved`  | Pet found / case closed            |
| `for_home` | `Available`     | `available` | Pet is still looking for a home    |
| `for_home` | `Adopted`       | `adopted`   | Pet has been adopted               |
| `adopt`    | `Open`          | `open`      | Person is still looking to adopt   |
| `adopt`    | `Matched`       | `matched`   | Person has been matched with a pet |

---

### Pet Type Enum Values

| Frontend value | DB value |
|----------------|----------|
| `Cat`          | `cat`    |
| `Dog`          | `dog`    |
| `Bird`         | `bird`   |
| `Other`        | `other`  |

---

### Absent Field: `breed`

The translation tables contain the key `'card.breed'` in all three languages (`app.js` lines 162, 320, 477). However:

- There is no `breed` input field in any of the four listing forms in `index.html`.
- `breed` does not appear in `LISTING_FIELDS` in `app.js`.
- `breed` is never read or written in any CRUD operation.

**Conclusion**: `breed` is a planned but unimplemented field. The database schema does **not** include it until a form field is added. When it is added, the column type will be `VARCHAR(100) NULL`.

---

### i18n Strategy for the First Backend Version

The first backend version stores title and description as plain text entered by the user. The `content_language` column records which language the user wrote in.

- `pet_name_or_title` — plain text, one language, as typed by the user
- `description` — plain text, same language
- `content_language` — `'en'`, `'ru'`, or `'he'`

No JSON columns and no translation table are used. The `titleI18n` and `descriptionI18n` objects that exist in some localStorage seed data are a client-side concern only and are not migrated to the database.

> A `listing_translations (listing_id, language, title, description)` table may be introduced in a future phase when manual multi-language editing becomes a product feature.

---

## Photo Storage

### Why photos are NOT stored as base64 in MySQL

1. **Size**: A 2 MB image becomes ~2.7 MB as a base64 string. Multiple images inflate row sizes significantly.
2. **Query performance**: Fetching large TEXT/BLOB columns slows down queries even when the image is not needed for that query.
3. **HTTP caching**: Files served from disk or a CDN can be cached by HTTP headers. Inline base64 cannot be cached independently.
4. **Backup size**: Database dumps grow proportionally with stored images.
5. **MySQL limits**: `TEXT` is limited to 65 535 bytes. `MEDIUMTEXT` (16 MB) or `LONGBLOB` would be needed for larger photos — unnecessarily complex.

### Recommended approach

Photos are stored as files on disk. The database stores only the file path or URL:

```sql
photo_url VARCHAR(500) NULL
-- examples:
-- '/uploads/m3f2a1b9c.webp'
-- 'assets/images/found-sample.webp'
-- 'https://cdn.example.com/photos/m3f2a1b9c.webp'
```

The upload endpoint (`POST /api/photos`) receives the file, saves it to disk, and returns the URL. The listing create/update endpoint stores that URL in `photo_url`.

### Current localStorage photo formats

```json
// User-uploaded photo (Base64 — local-only MVP data; never stored in MySQL; user must re-upload as a file when moving to the backend):
{
  "source": "local",
  "dataUrl": "data:image/webp;base64,...",
  "fileName": "my-cat.jpg",
  "mimeType": "image/webp"
}

// Seeded asset photo (relative path — store as-is or convert to absolute URL):
{
  "source": "asset",
  "url": "assets/images/found-sample.webp"
}

// No photo:
null
```

---

## Stories Table: `stories` (Phase 6 — separate future module)

> **Out of scope for the first backend milestone.** The `stories` table is created in Phase 6, after all four listing sections (`found`, `lost`, `for_home`, `adopt`) are stable on the API. Do not create this table during Phases 2–5.

Stories are a separate entity with a completely different field set from the four listing sections.

```sql
CREATE TABLE stories (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    title       VARCHAR(255)    NOT NULL,
    category    VARCHAR(20)     NOT NULL,
    text        TEXT            NOT NULL,
    media_url   VARCHAR(500)    NULL,
    story_date  DATE            NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NULL     ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_story_category
        CHECK (category IN ('funny', 'touching', 'useful'))

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

### Stories Field Reference

| Field        | MySQL Type   | Required | Example                       | localStorage field | Notes                                                          |
|--------------|--------------|----------|-------------------------------|--------------------|----------------------------------------------------------------|
| `id`         | INT UNSIGNED | Yes      | `1`                           | `id` (base36)      | Auto-increment integer.                                        |
| `title`      | VARCHAR(255) | Yes      | `'My cat thinks she owns…'`   | `title`            | Required.                                                      |
| `category`   | VARCHAR(20)  | Yes      | `'funny'`                     | `category`         | Values: `funny`, `touching`, `useful`. Frontend stores capitalized. |
| `text`       | TEXT         | Yes      | `'Every evening, Mochi…'`     | `text`             | Story body.                                                    |
| `media_url`  | VARCHAR(500) | No       | `'https://example.com/photo'` | `mediaUrl`         | User-entered URL. No format validation in current frontend.    |
| `story_date` | DATE         | Yes      | `'2026-06-15'`                | `date`             | Set to today on every create/edit (known limitation L-7).      |
| `created_at` | DATETIME     | Yes      | `'2026-06-15 10:00:00'`       | `createdAt` (ms)   | Set automatically by MySQL on INSERT.                          |
| `updated_at` | DATETIME     | No       | `'2026-06-15 10:30:00'`       | *(absent)*         | Set automatically by MySQL on UPDATE.                          |

> Stories have no `scenario`, `pet_type`, `city`, `contact_email`, `contact_phone`, `status`, `content_language`, or `photo_url` fields. They are stored in a separate table.

---

## Recommended Indexes

```sql
-- Filter listings by scenario (most common query)
CREATE INDEX idx_listings_scenario
    ON listings (scenario);

-- Filter listings by pet type within a scenario
CREATE INDEX idx_listings_scenario_pet_type
    ON listings (scenario, pet_type);

-- Filter listings by status within a scenario
CREATE INDEX idx_listings_scenario_status
    ON listings (scenario, status);

-- Sort listings newest first
CREATE INDEX idx_listings_created_at
    ON listings (created_at DESC);

-- Filter stories by category (Phase 6 — create when the stories table is created)
CREATE INDEX idx_stories_category
    ON stories (category);
```

---

## SQL Practice Examples (MySQL Workbench or any MySQL client)

These queries are intended for QA students to practice verifying data after API operations:

```sql
-- All open found pets
SELECT * FROM listings
WHERE scenario = 'found' AND status = 'open'
ORDER BY created_at DESC;

-- Count listings by scenario
SELECT scenario, COUNT(*) AS total
FROM listings
GROUP BY scenario;

-- Count listings by scenario and status
SELECT scenario, status, COUNT(*) AS total
FROM listings
GROUP BY scenario, status
ORDER BY scenario, status;

-- Find listing just created (most recent)
SELECT * FROM listings
ORDER BY created_at DESC
LIMIT 1;

-- Find all cat listings in a specific city
SELECT id, scenario, title, status
FROM listings
WHERE pet_type = 'cat' AND city = 'Austin';

-- Verify a specific listing after PUT request
SELECT * FROM listings WHERE id = 42;

-- Check that deleted listing is gone
SELECT COUNT(*) FROM listings WHERE id = 99;

-- All listings with no photo
SELECT id, scenario, title FROM listings
WHERE photo_url IS NULL;

-- Listings in Hebrew
SELECT id, scenario, title FROM listings
WHERE content_language = 'he';
```

---

## Contradictions and Uncertainties in the Current Code

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| C-1 | `breed` in translations but not in data | `app.js` lines 162, 320, 477 | `'card.breed'` key exists in all three languages but no form field or data model entry exists. |
| C-2 | `updatedAt` missing from current data | `app.js` `setupListingSection()` | When an item is edited, no `updatedAt` timestamp is set. MySQL's `ON UPDATE CURRENT_TIMESTAMP` will handle this automatically. |
| C-3 | Story `date` is always overwritten on edit | `app.js` line 1179 | `obj.date = new Date().toISOString().split('T')[0]` runs on every story submit including edits. |
| C-4 | `id` generation uses `Date.now()` + random suffix | `app.js` `genId()` | Sufficient for single-user localStorage; backend will use MySQL AUTO_INCREMENT. |
| C-5 | `contentLanguage` absent from seed data | `app.js` `seedSampleData()` | Seeded records have no `contentLanguage`. The `DEFAULT 'en'` in MySQL handles this. |
| C-6 | Status casing inconsistency | `app.js` `SECTION_STATUSES`, `index.html` | Frontend stores `Open`, `Resolved`, `Available`, `Adopted`, `Matched`. DB uses lowercase. Mapping layer required. |
