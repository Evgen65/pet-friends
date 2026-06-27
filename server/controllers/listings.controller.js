const { pool } = require('../db/connection');

const ALLOWED_SCENARIOS = ['found', 'lost', 'for_home', 'adopt'];
const ALLOWED_PET_TYPES = ['cat', 'dog', 'bird', 'rabbit', 'other'];
const ALLOWED_LANGUAGES = ['en', 'ru', 'he'];
const DATE_ONLY_RE      = /^\d{4}-\d{2}-\d{2}$/;

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
  const { scenario } = req.query;

  if (scenario !== undefined && !ALLOWED_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ status: 'error', message: 'Invalid scenario' });
  }

  try {
    let sql = BASE_SELECT;
    const params = [];

    if (scenario) {
      sql += ' AND scenario = ?';
      params.push(scenario);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toApiShape));
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
