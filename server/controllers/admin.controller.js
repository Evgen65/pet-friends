const { pool } = require('../db/connection');
const { toApiShape } = require('./listings.controller');

const ALLOWED_SCENARIOS = ['found', 'lost', 'for_home', 'adopt'];
const ALLOWED_PET_TYPES = ['cat', 'dog', 'bird', 'rabbit', 'other'];
const POSITIVE_INT_RE   = /^\d+$/;
const MAX_LIMIT          = 100;
const DEFAULT_LIMIT      = 50;
const MAX_BULK_IDS       = 100;

// Columns matched by the `q` free-text query param — same set the public
// listings API searches.
const SEARCH_COLUMNS = [
  'pet_name_or_title', 'breed', 'city', 'description', 'contact_email', 'contact_phone',
];

// Columns and keywords matched by testOnly=true — a preview filter only,
// never a deletion criterion by itself.
const TEST_ONLY_COLUMNS  = ['pet_name_or_title', 'description', 'city', 'contact_email', 'contact_phone'];
const TEST_ONLY_KEYWORDS = ['test', 'automation', 'demo', 'qa', 'qwerty', 'asdf'];

// deleted_at IS NULL is the base filter — soft-deleted rows are never
// returned. No users join: admin review doesn't need the owner's display name.
const BASE_SELECT = `
  SELECT
    l.id, l.scenario, l.pet_type, l.pet_name_or_title, l.breed, l.city,
    DATE_FORMAT(l.event_date, '%Y-%m-%d') AS event_date, l.description,
    l.contact_email, l.contact_phone, l.status, l.content_language,
    l.photo_url, l.created_by_user_id,
    l.created_at, l.updated_at
  FROM listings l
  WHERE l.deleted_at IS NULL
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function validateAdminListingsQuery(query) {
  const scenario       = presentString(query.scenario);
  const petType        = presentString(query.petType);
  const city            = presentString(query.city);
  const status          = presentString(query.status);
  const q                = presentString(query.q);
  const createdByUserIdRaw = presentString(query.createdByUserId);
  const testOnly          = query.testOnly === 'true';

  const errors = [];

  if (scenario !== undefined && !ALLOWED_SCENARIOS.includes(scenario))
    errors.push('Invalid scenario');

  if (petType !== undefined && !ALLOWED_PET_TYPES.includes(petType))
    errors.push('Invalid petType');

  const createdByUserId = createdByUserIdRaw !== undefined
    ? parsePositiveInt(createdByUserIdRaw, 'createdByUserId', errors, undefined)
    : undefined;

  const page = parsePositiveInt(query.page, 'page', errors, 1);

  let limit = parsePositiveInt(query.limit, 'limit', errors, DEFAULT_LIMIT);
  if (limit !== undefined && limit > MAX_LIMIT) {
    errors.push(`limit must not exceed ${MAX_LIMIT}`);
  }

  return {
    errors,
    values: { scenario, petType, city, status, q, createdByUserId, testOnly, page, limit },
  };
}

function validateBulkIds(body) {
  const rawIds = body?.ids;
  const errors = [];

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    errors.push('ids is required and must be a non-empty array');
    return { errors, values: [] };
  }

  if (rawIds.length > MAX_BULK_IDS) {
    errors.push(`ids must not exceed ${MAX_BULK_IDS} items per request`);
  }

  const ids = [];
  for (const raw of rawIds) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      errors.push('every id must be a positive integer');
      break;
    }
    ids.push(n);
  }

  return { errors, values: ids };
}

// ── Route handlers ───────────────────────────────────────────────────────────

// Admin-only listing review, used by the cleanup UI to find candidate
// test/demo/automation listings. Only ever reads active (non-deleted) rows —
// deletion happens exclusively through bulkDeleteListings below.
async function getAdminListings(req, res) {
  const { errors, values } = validateAdminListingsQuery(req.query);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  const { scenario, petType, city, status, q, createdByUserId, testOnly, page, limit } = values;

  const conditions = [];
  const params     = [];

  if (scenario)          { conditions.push('l.scenario = ?');           params.push(scenario); }
  if (petType)           { conditions.push('l.pet_type = ?');            params.push(petType); }
  if (city)               { conditions.push('LOWER(l.city) LIKE ?');      params.push(`%${city.toLowerCase()}%`); }
  if (status)             { conditions.push('LOWER(l.status) = ?');       params.push(status.toLowerCase()); }
  if (createdByUserId)    { conditions.push('l.created_by_user_id = ?');  params.push(createdByUserId); }

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    conditions.push('(' + SEARCH_COLUMNS.map(c => `LOWER(l.${c}) LIKE ?`).join(' OR ') + ')');
    SEARCH_COLUMNS.forEach(() => params.push(like));
  }

  if (testOnly) {
    const clauses = [];
    TEST_ONLY_COLUMNS.forEach(col => {
      TEST_ONLY_KEYWORDS.forEach(keyword => {
        clauses.push(`LOWER(l.${col}) LIKE ?`);
        params.push(`%${keyword}%`);
      });
    });
    conditions.push('(' + clauses.join(' OR ') + ')');
  }

  const whereExtra = conditions.length ? ' AND ' + conditions.join(' AND ') : '';

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM listings l WHERE l.deleted_at IS NULL${whereExtra}`,
      params
    );
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    const sql    = `${BASE_SELECT}${whereExtra} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [...params, limit, offset]);

    res.json({
      items: rows.map(row => toApiShape(row)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('getAdminListings error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch listings' });
  }
}

// Soft-deletes selected listings. Never touches rows already soft-deleted,
// never hard-deletes, never removes uploaded files, never affects Pet
// Stories or users.
async function bulkDeleteListings(req, res) {
  const { errors, values: ids } = validateBulkIds(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await pool.query(
      `UPDATE listings SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
    res.json({ status: 'ok', deletedCount: result.affectedRows });
  } catch (err) {
    console.error('bulkDeleteListings error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete listings' });
  }
}

module.exports = { getAdminListings, bulkDeleteListings };
