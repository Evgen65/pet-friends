# API_CONTRACT.md — Pet Friends REST API

> REST API contract for the Pet Friends backend.
> Data is stored in a MySQL database (`pet_friends`).
> All field names use camelCase in the JSON response (matching JavaScript conventions).
> Internal enum values are lowercase English strings.
> This contract is a design document — nothing is implemented yet.
> All request examples are suitable for Postman practice.

---

## Base URL

```
Local development:  http://localhost:3000/api
Production:         https://api.petfriends.example.com/api  (TBD)
```

---

## Common Conventions

### Content type

All request and response bodies are `application/json`.

### Timestamps

`createdAt` and `updatedAt` are returned as ISO 8601 strings:
```
"2026-06-15T10:30:00.000Z"
```

MySQL stores them as `DATETIME`. The API layer converts to ISO 8601 before returning.

### IDs

The database uses MySQL `AUTO_INCREMENT` integers as primary keys. The frontend currently generates IDs with `genId()` (base36 string). Backend IDs are integers. The migration plan addresses backward compatibility.

### Scenario values

| UI section name   | `scenario` value | DB `scenario` column |
|-------------------|-----------------|----------------------|
| Found Pets        | `found`         | `'found'`            |
| Lost Pets         | `lost`          | `'lost'`             |
| Pets for Home     | `for_home`      | `'for_home'`         |
| I Want to Adopt   | `adopt`         | `'adopt'`            |

### petType values

`cat`, `dog`, `bird`, `other`

### Status values by scenario

| scenario   | allowed status values  | DB column values          |
|------------|------------------------|---------------------------|
| `found`    | `open`, `resolved`     | `'open'`, `'resolved'`    |
| `lost`     | `open`, `resolved`     | `'open'`, `'resolved'`    |
| `for_home` | `available`, `adopted` | `'available'`, `'adopted'`|
| `adopt`    | `open`, `matched`      | `'open'`, `'matched'`     |

### contentLanguage values

`en`, `ru`, `he`

---

## Endpoints

---

### GET /api/health

**Purpose**: Verify the backend is running. Used in Phase 2 before any database work.

**Postman setup**:
- Method: `GET`
- URL: `http://localhost:3000/api/health`
- No headers or body required

**Request**
```
GET http://localhost:3000/api/health
```

**Success response — 200 OK**
```json
{
  "status": "ok",
  "timestamp": "2026-06-15T10:30:00.000Z"
}
```

**QA verification**: Status code is `200`. Body has `status: "ok"`. `timestamp` is a valid ISO 8601 string.

---

### GET /api/listings

**Purpose**: Return a paginated list of listings. Data is read from the MySQL `listings` table. Supports filtering by scenario, pet type, city, status, and content language.

**Postman setup**:
- Method: `GET`
- URL: `http://localhost:3000/api/listings`
- Query params can be added in the Params tab

**Request examples**
```
GET http://localhost:3000/api/listings
GET http://localhost:3000/api/listings?scenario=found
GET http://localhost:3000/api/listings?scenario=found&status=open
GET http://localhost:3000/api/listings?petType=cat&city=Austin
GET http://localhost:3000/api/listings?scenario=lost&limit=10&offset=0
GET http://localhost:3000/api/listings?search=tabby
GET http://localhost:3000/api/listings?contentLanguage=he
```

**Supported query parameters**

| Parameter         | Type   | Description                                                  | Example              |
|-------------------|--------|--------------------------------------------------------------|----------------------|
| `scenario`        | string | Filter by section: `found`, `lost`, `for_home`, `adopt`     | `scenario=found`     |
| `petType`         | string | Filter by animal type: `cat`, `dog`, `bird`, `other`        | `petType=cat`        |
| `city`            | string | Exact city match (case-insensitive)                         | `city=Austin`        |
| `status`          | string | Filter by status value (depends on scenario)                 | `status=open`        |
| `search`          | string | Full-text search over `title`, `city`, `description`        | `search=tabby`       |
| `contentLanguage` | string | Filter by listing language: `en`, `ru`, `he`                | `contentLanguage=ru` |
| `limit`           | int    | Max records to return. Default: 50. Max: 100.               | `limit=20`           |
| `offset`          | int    | Records to skip for pagination. Default: 0.                 | `offset=40`          |

**Success response — 200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "scenario": "found",
      "petType": "cat",
      "petNameOrTitle": "Orange tabby cat",
      "city": "Austin",
      "eventDate": "2026-06-14",
      "description": "Found near Central Park. Very friendly, has no collar.",
      "contactEmail": "finder@example.com",
      "contactPhone": "555-0101",
      "status": "open",
      "contentLanguage": "en",
      "photoUrl": null,
      "createdAt": "2026-06-14T08:00:00.000Z",
      "updatedAt": null
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

**MySQL query executed by this endpoint (approximate)**
```sql
SELECT * FROM listings
WHERE scenario = 'found'
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

**Validation error — 400 Bad Request**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid value for 'scenario'. Allowed values: found, lost, for_home, adopt.",
  "field": "scenario"
}
```

**QA verification**:
- Status code is `200`
- Response has `data` array, `total`, `limit`, `offset`
- Count in `total` matches `SELECT COUNT(*) FROM listings WHERE scenario = 'found';` in MySQL Workbench
- Each item in `data` has all expected fields
- Apply an invalid `scenario` value (e.g., `scenario=xyz`) → expect `400`

---

### GET /api/listings/:id

**Purpose**: Return a single listing by its numeric ID. Reads one row from the MySQL `listings` table.

**Postman setup**:
- Method: `GET`
- URL: `http://localhost:3000/api/listings/1`

**Request examples**
```
GET http://localhost:3000/api/listings/1
GET http://localhost:3000/api/listings/42
GET http://localhost:3000/api/listings/999
```

**Success response — 200 OK**
```json
{
  "id": 1,
  "scenario": "found",
  "petType": "cat",
  "title": "Orange tabby cat",
  "city": "Austin",
  "eventDate": "2026-06-14",
  "description": "Found near Central Park. Very friendly, has no collar. Eating well.",
  "contactEmail": "finder@example.com",
  "contactPhone": "555-0101",
  "status": "open",
  "contentLanguage": "en",
  "photoUrl": null,
  "createdAt": "2026-06-14T08:00:00.000Z",
  "updatedAt": null
}
```

**Not found — 404 Not Found**
```json
{
  "error": "NOT_FOUND",
  "message": "Listing with id 999 not found."
}
```

**QA verification**:
- Request an existing ID → `200` with correct fields
- Compare response fields with `SELECT * FROM listings WHERE id = 1;` in MySQL Workbench
- Request a non-existent ID (e.g., `999`) → `404`
- Request an invalid ID format (e.g., `abc`) → `400`

---

### POST /api/listings

**Purpose**: Create a new listing. Inserts a row into the MySQL `listings` table.

**Postman setup**:
- Method: `POST`
- URL: `http://localhost:3000/api/listings`
- Headers: `Content-Type: application/json`
- Body: raw JSON (see below)

**Request**
```
POST http://localhost:3000/api/listings
Content-Type: application/json
```

**Request body**
```json
{
  "scenario": "found",
  "petType": "cat",
  "petNameOrTitle": "Orange tabby cat",
  "city": "Austin",
  "eventDate": "2026-06-14",
  "description": "Found near Central Park. Very friendly, has no collar.",
  "contactEmail": "finder@example.com",
  "contactPhone": "555-0101",
  "status": "open",
  "contentLanguage": "en",
  "photoUrl": null
}
```

**Required fields**: `scenario`, `petType`, `petNameOrTitle`, `city`, `eventDate`, `description`, `status`

**Optional fields**: `contactEmail`, `contactPhone`, `contentLanguage` (defaults to `"en"`), `photoUrl`

**Success response — 201 Created**
```json
{
  "id": 42,
  "scenario": "found",
  "petType": "cat",
  "title": "Orange tabby cat",
  "city": "Austin",
  "eventDate": "2026-06-14",
  "description": "Found near Central Park. Very friendly, has no collar.",
  "contactEmail": "finder@example.com",
  "contactPhone": "555-0101",
  "status": "open",
  "contentLanguage": "en",
  "photoUrl": null,
  "createdAt": "2026-06-15T10:30:00.000Z",
  "updatedAt": null
}
```

**Validation error — 400 (missing required field)**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Field 'title' is required.",
  "field": "title"
}
```

**Validation error — 400 (invalid enum value)**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid value for 'petType'. Allowed values: cat, dog, bird, other.",
  "field": "petType"
}
```

**Validation error — 400 (invalid status for scenario)**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Status 'adopted' is not valid for scenario 'found'. Allowed values: open, resolved.",
  "field": "status"
}
```

**Validation error — 400 (invalid email format)**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Field 'contactEmail' must be a valid email address.",
  "field": "contactEmail"
}
```

**QA verification**:
- Send valid body → `201`, note the returned `id`
- Run `SELECT * FROM listings WHERE id = 42;` in MySQL Workbench — verify all fields match
- Send request with missing `title` → `400`
- Send request with `petType: "hamster"` → `400`
- Send request with `status: "adopted"` and `scenario: "found"` → `400`
- Send request with `contactEmail: "not-an-email"` → `400`

---

### PUT /api/listings/:id

**Purpose**: Update an existing listing. Full replacement — all fields are updated. Updates the row in the MySQL `listings` table and the `updated_at` column is set automatically.

**Postman setup**:
- Method: `PUT`
- URL: `http://localhost:3000/api/listings/42`
- Headers: `Content-Type: application/json`
- Body: raw JSON

**Request**
```
PUT http://localhost:3000/api/listings/42
Content-Type: application/json
```

**Request body** — same shape as `POST /api/listings`
```json
{
  "scenario": "found",
  "petType": "cat",
  "petNameOrTitle": "Orange tabby cat — now home!",
  "city": "Austin",
  "eventDate": "2026-06-14",
  "description": "Found near Central Park. Now reunited with owner.",
  "contactEmail": "finder@example.com",
  "contactPhone": "555-0101",
  "status": "resolved",
  "contentLanguage": "en",
  "photoUrl": null
}
```

**Success response — 200 OK**
```json
{
  "id": 42,
  "scenario": "found",
  "petType": "cat",
  "petNameOrTitle": "Orange tabby cat — now home!",
  "city": "Austin",
  "eventDate": "2026-06-14",
  "description": "Found near Central Park. Now reunited with owner.",
  "contactEmail": "finder@example.com",
  "contactPhone": "555-0101",
  "status": "resolved",
  "contentLanguage": "en",
  "photoUrl": null,
  "createdAt": "2026-06-14T08:00:00.000Z",
  "updatedAt": "2026-06-15T10:45:00.000Z"
}
```

**Not found — 404 Not Found**
```json
{
  "error": "NOT_FOUND",
  "message": "Listing with id 999 not found."
}
```

**QA verification**:
- Send valid PUT → `200`, note that `updatedAt` is now set
- Run `SELECT * FROM listings WHERE id = 42;` in MySQL Workbench — verify `status = 'resolved'` and `updated_at` changed
- Send PUT with non-existent ID → `404`
- Send PUT with same invalid field values as POST → `400`
- Verify that `createdAt` did **not** change (it should stay the same as before the update)

---

### DELETE /api/listings/:id

**Purpose**: Delete a listing by ID. Removes the row from the MySQL `listings` table.

**Postman setup**:
- Method: `DELETE`
- URL: `http://localhost:3000/api/listings/42`
- No body required

**Request**
```
DELETE http://localhost:3000/api/listings/42
```

**Success response — 204 No Content**

*(No response body.)*

**Not found — 404 Not Found**
```json
{
  "error": "NOT_FOUND",
  "message": "Listing with id 42 not found."
}
```

**QA verification**:
- Delete an existing listing → `204`, no body
- Run `SELECT COUNT(*) FROM listings WHERE id = 42;` → must return `0`
- Immediately `GET /api/listings/42` → `404`
- Delete the same ID again → `404`
- Verify the listing is also gone from the UI

---

## Stories Endpoints (Future — Phase 6, separate module)

Stories are a separate entity from listings with a different field set and their own API module. They are out of scope for the first backend milestone (Phases 2–5). The `stories` table and `/api/stories` endpoints are planned for Phase 6, after all four listing sections are stable on the API. Data will be stored in the MySQL `stories` table.

```
GET    /api/stories
GET    /api/stories/:id
POST   /api/stories
PUT    /api/stories/:id
DELETE /api/stories/:id
```

Stories query parameters: `category` (`funny`, `touching`, `useful`), `search`, `limit`, `offset`.

Story response shape:
```json
{
  "id": 1,
  "title": "My cat thinks she owns the Wi-Fi router",
  "category": "funny",
  "text": "Every evening, Mochi sits directly on top of the Wi-Fi router…",
  "mediaUrl": null,
  "storyDate": "2026-06-15",
  "createdAt": "2026-06-15T10:00:00.000Z",
  "updatedAt": null
}
```

---

## Photo Upload Endpoint (Future — Phase 6)

```
POST /api/photos
Content-Type: multipart/form-data
```

**Request**: `multipart/form-data` with a single file field named `photo`.

**Accepted types**: `image/jpeg`, `image/png`, `image/webp`

**Max size**: 2 MB (matching current frontend validation)

**Success response — 201 Created**
```json
{
  "photoUrl": "/uploads/m3f2a1b9c.webp"
}
```

The returned `photoUrl` is stored in the `photo_url` column of the `listings` table when creating or updating a listing.

**Postman setup for photo upload**:
- Method: `POST`
- URL: `http://localhost:3000/api/photos`
- Body: `form-data`, key `photo`, type `File`

**QA verification**:
- Upload a valid image → `201`, note the `photoUrl`
- Check the file exists on disk at the returned path
- Create a listing with that `photoUrl` and verify it is stored in MySQL
- Upload a file larger than 2 MB → expect `400`
- Upload a non-image file (e.g., `.txt`) → expect `400`

---

## HTTP Status Code Summary

| Code | Meaning                               |
|------|---------------------------------------|
| 200  | Success (GET, PUT)                    |
| 201  | Created (POST)                        |
| 204  | Deleted (DELETE, no body)             |
| 400  | Validation error — invalid input      |
| 404  | Resource not found                    |
| 500  | Internal server error (unexpected)    |

---

## Notes on Mapping Frontend Fields to API Fields

| Frontend form field | API field         | MySQL column       | Note                                           |
|---------------------|-------------------|--------------------|------------------------------------------------|
| `type`              | `petType`         | `pet_type`         | Renamed; value normalized to lowercase         |
| `title`             | `petNameOrTitle`  | `pet_name_or_title`| Renamed; plain text in user's chosen language  |
| `city`              | `city`            | `city`             | Same name and value                            |
| `date`              | `eventDate`       | `event_date`       | Renamed; MySQL DATE type                       |
| `description`       | `description`     | `description`      | Same name and value                            |
| `email`             | `contactEmail`    | `contact_email`    | Renamed for clarity                            |
| `phone`             | `contactPhone`    | `contact_phone`    | Renamed for clarity                            |
| `status`            | `status`          | `status`           | Value normalized to lowercase                  |
| `contentLanguage`   | `contentLanguage` | `content_language` | Same value                                     |
| `photo` (object)    | `photoUrl` (string or null) | `photo_url` | Photo object flattened to URL string      |
| `createdAt` (ms int)| `createdAt` (ISO 8601) | `created_at` | MySQL DATETIME → ISO 8601 string in response  |
| *(absent)*          | `updatedAt`       | `updated_at`       | New field; auto-set by MySQL on UPDATE         |
| *(key name)*        | `scenario`        | `scenario`         | Not in localStorage; derived from array key    |

---

## QA Checklist for Each Endpoint

Use this checklist when testing each endpoint in Postman, then verify results in a MySQL client. Examples below reference MySQL Workbench, but any MySQL-compatible client works.

### For every endpoint
- [ ] Status code matches expected value
- [ ] Response body structure matches contract
- [ ] Content-Type header is `application/json`

### GET /api/health
- [ ] Returns 200 with `{ "status": "ok", "timestamp": "..." }`
- [ ] `timestamp` is a valid ISO 8601 string

### GET /api/listings
- [ ] Returns 200 with `data` array and `total` count
- [ ] `total` matches `SELECT COUNT(*) FROM listings;` in MySQL Workbench
- [ ] Filtering by `scenario` returns only matching rows
- [ ] Pagination: `limit=2&offset=0` returns 2 items; `offset=2` returns the next 2
- [ ] Invalid `scenario` value returns 400

### GET /api/listings/:id
- [ ] Existing ID returns 200 with correct data matching the DB row
- [ ] Non-existent ID returns 404
- [ ] Non-numeric ID returns 400

### POST /api/listings
- [ ] Valid body returns 201 with the new listing including generated `id`
- [ ] Row exists in MySQL: `SELECT * FROM listings WHERE id = <new_id>;`
- [ ] `createdAt` is set; `updatedAt` is null
- [ ] Missing required field returns 400
- [ ] Invalid `petType` returns 400
- [ ] `status` invalid for the given `scenario` returns 400

### PUT /api/listings/:id
- [ ] Valid body returns 200 with updated fields
- [ ] `updatedAt` is now set in the response and in MySQL
- [ ] `createdAt` is unchanged
- [ ] Non-existent ID returns 404

### DELETE /api/listings/:id
- [ ] Existing ID returns 204 with no body
- [ ] Row is gone: `SELECT COUNT(*) FROM listings WHERE id = <deleted_id>;` returns 0
- [ ] Second DELETE of same ID returns 404
- [ ] GET on deleted ID returns 404
