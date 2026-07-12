const { pool } = require('../db/connection');

const ALLOWED_SCENARIOS = ['found', 'lost', 'for_home', 'adopt'];
const ALLOWED_PET_TYPES = ['cat', 'dog', 'bird', 'rabbit', 'other'];
const ALLOWED_LANGUAGES = ['en', 'ru', 'he'];
const ALLOWED_SORTS     = ['newest', 'oldest', 'city_asc', 'city_desc'];
const DATE_ONLY_RE      = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_INT_RE   = /^\d+$/;
const MAX_LIMIT         = 100;
const DEFAULT_LIMIT     = 50;

// Columns searched by the `q` free-text query parameter.
const SEARCH_COLUMNS = [
  'pet_name_or_title', 'breed', 'city', 'description', 'contact_email', 'contact_phone',
];

const SORT_CLAUSES = {
  newest:    'created_at DESC',
  oldest:    'created_at ASC',
  city_asc:  'city ASC, created_at DESC',
  city_desc: 'city DESC, created_at DESC',
};

// deleted_at IS NULL is the base filter — soft-deleted rows are never returned.
const BASE_SELECT = `
  SELECT
    id, scenario, pet_type, pet_name_or_title, breed, city,
    DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, description,
    contact_email, contact_phone, status, content_language,
    photo_url, created_at, updated_at
  FROM listings
  WHERE deleted_at IS NULL
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateListingId(rawId) {
  const id = parseInt(rawId, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateListingPayload(body) {
  const {
    scenario,
    petType,
    petNameOrTitle,
    breed           = null,
    city,
    eventDate       = null,
    description,
    contactEmail    = null,
    contactPhone    = null,
    status,
    contentLanguage = 'en',
    photoUrl        = null,
  } = body ?? {};

  const errors = [];

  if (!scenario)
    errors.push('scenario is required');
  else if (!ALLOWED_SCENARIOS.includes(scenario))
    errors.push(`scenario must be one of: ${ALLOWED_SCENARIOS.join(', ')}`);

  if (!petType)
    errors.push('petType is required');
  else if (!ALLOWED_PET_TYPES.includes(petType))
    errors.push(`petType must be one of: ${ALLOWED_PET_TYPES.join(', ')}`);

  if (!petNameOrTitle?.trim()) errors.push('petNameOrTitle is required');
  if (!city?.trim())           errors.push('city is required');
  if (!description?.trim())    errors.push('description is required');

  if (contentLanguage && !ALLOWED_LANGUAGES.includes(contentLanguage))
    errors.push(`contentLanguage must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);

  if (eventDate != null && !DATE_ONLY_RE.test(eventDate))
    errors.push('eventDate must be in YYYY-MM-DD format');

  if (status !== undefined && !String(status).trim())
    errors.push('status must not be empty');

  return {
    errors,
    values: {
      scenario, petType, petNameOrTitle, breed, city, eventDate,
      description, contactEmail, contactPhone, status, contentLanguage, photoUrl,
    },
  };
}

// A query param counts as "present" only when it's a non-empty string —
// Express gives us '' for `?city=` and that should be treated as absent.
function presentString(raw) {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

function parsePositiveInt(raw, label, errors, fallback) {
  if (raw === undefined) return fallback;
  const str = String(raw).trim();
  const n   = POSITIVE_INT_RE.test(str) ? parseInt(str, 10) : NaN;
  if (!Number.isInteger(n) || n <= 0) {
    errors.push(`${label} must be a positive integer`);
    return fallback;
  }
  return n;
}

function validateListingQuery(query) {
  const scenario = presentString(query.scenario);
  const petType  = presentString(query.petType);
  const city     = presentString(query.city);
  const status   = presentString(query.status);
  const q        = presentString(query.q);
  const sort     = presentString(query.sort) ?? 'newest';

  const errors = [];

  if (scenario !== undefined && !ALLOWED_SCENARIOS.includes(scenario))
    errors.push('Invalid scenario');

  if (petType !== undefined && !ALLOWED_PET_TYPES.includes(petType))
    errors.push('Invalid petType');

  if (!ALLOWED_SORTS.includes(sort))
    errors.push('Invalid sort');

  const page = parsePositiveInt(query.page, 'page', errors, 1);

  let limit = parsePositiveInt(query.limit, 'limit', errors, DEFAULT_LIMIT);
  if (limit !== undefined && limit > MAX_LIMIT) {
    errors.push(`limit must not exceed ${MAX_LIMIT}`);
  }

  return {
    errors,
    values: {
      scenario, petType, city, status, q, sort, page, limit,
      withMeta: query.withMeta === 'true',
    },
  };
}

function toApiShape(row) {
  return {
    id:              row.id,
    scenario:        row.scenario,
    petType:         row.pet_type,
    petNameOrTitle:  row.pet_name_or_title,
    breed:           row.breed,
    city:            row.city,
    eventDate:       row.event_date,
    description:     row.description,
    contactEmail:    row.contact_email,
    contactPhone:    row.contact_phone,
    status:          row.status,
    contentLanguage: row.content_language,
    photoUrl:        row.photo_url,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// Internal: fetch one active row by id.  Returns null when not found or deleted.
async function fetchById(id) {
  const [rows] = await pool.query(BASE_SELECT + ' AND id = ?', [id]);
  return rows[0] ?? null;
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function getListings(req, res) {
  const { errors, values } = validateListingQuery(req.query);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  const { scenario, petType, city, status, q, sort, page, limit, withMeta } = values;

  const conditions = [];
  const params     = [];

  if (scenario) { conditions.push('scenario = ?');       params.push(scenario); }
  if (petType)  { conditions.push('pet_type = ?');        params.push(petType); }
  if (city)     { conditions.push('LOWER(city) LIKE ?');  params.push(`%${city.toLowerCase()}%`); }
  if (status)   { conditions.push('LOWER(status) = ?');   params.push(status.toLowerCase()); }
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push('(' + SEARCH_COLUMNS.map(c => `LOWER(${c}) LIKE ?`).join(' OR ') + ')');
    SEARCH_COLUMNS.forEach(() => params.push(like));
  }

  const whereExtra = conditions.length ? ' AND ' + conditions.join(' AND ') : '';
  const orderBy    = SORT_CLAUSES[sort];

  try {
    let total = null;
    if (withMeta) {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM listings WHERE deleted_at IS NULL${whereExtra}`,
        params
      );
      total = countRows[0].total;
    }

    const offset = (page - 1) * limit;
    const sql    = `${BASE_SELECT}${whereExtra} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [...params, limit, offset]);

    if (!withMeta) {
      return res.json(rows.map(toApiShape));
    }

    res.json({
      items: rows.map(toApiShape),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('getListings error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch listings' });
  }
}

async function getListing(req, res) {
  const id = validateListingId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid listing id' });

  try {
    const row = await fetchById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Listing not found' });
    res.json(toApiShape(row));
  } catch (err) {
    console.error('getListing error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch listing' });
  }
}

async function createListing(req, res) {
  const { errors, values } = validateListingPayload(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO listings
         (scenario, pet_type, pet_name_or_title, breed, city, event_date,
          description, contact_email, contact_phone, status, content_language, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.scenario, values.petType, values.petNameOrTitle, values.breed,
        values.city, values.eventDate, values.description, values.contactEmail,
        values.contactPhone, values.status ?? 'open', values.contentLanguage, values.photoUrl,
      ]
    );

    const created = await fetchById(result.insertId);
    res.status(201).json(toApiShape(created));
  } catch (err) {
    console.error('createListing error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to create listing' });
  }
}

async function updateListing(req, res) {
  const id = validateListingId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid listing id' });

  const { errors, values } = validateListingPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const existing = await fetchById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Listing not found' });

    await pool.query(
      `UPDATE listings SET
         scenario = ?, pet_type = ?, pet_name_or_title = ?, breed = ?,
         city = ?, event_date = ?, description = ?, contact_email = ?,
         contact_phone = ?, status = ?, content_language = ?, photo_url = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        values.scenario,
        values.petType,
        values.petNameOrTitle,
        values.breed,
        values.city,
        values.eventDate,
        values.description,
        values.contactEmail,
        values.contactPhone,
        values.status ?? existing.status,
        values.contentLanguage,
        values.photoUrl,
        id,
      ]
    );

    const updated = await fetchById(id);
    res.json(toApiShape(updated));
  } catch (err) {
    console.error('updateListing error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to update listing' });
  }
}

async function deleteListing(req, res) {
  const id = validateListingId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid listing id' });

  try {
    const existing = await fetchById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Listing not found' });

    await pool.query(
      'UPDATE listings SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    res.json({ status: 'ok', message: 'Listing deleted', id });
  } catch (err) {
    console.error('deleteListing error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete listing' });
  }
}

module.exports = { getListings, getListing, createListing, updateListing, deleteListing };
