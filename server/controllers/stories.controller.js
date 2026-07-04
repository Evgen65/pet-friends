const { pool } = require('../db/connection');

const ALLOWED_PET_TYPES   = ['cat', 'dog', 'bird', 'rabbit', 'other'];
const ALLOWED_MEDIA_TYPES = ['image', 'video', 'none'];
const ALLOWED_LANGUAGES   = ['en', 'ru', 'he'];

// deleted_at IS NULL is the base filter — soft-deleted rows are never returned.
const BASE_SELECT = `
  SELECT
    id, title, pet_name, pet_type, city, story_text,
    media_type, media_url, content_language, status,
    created_at, updated_at
  FROM pet_stories
  WHERE deleted_at IS NULL
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateStoryId(rawId) {
  const id = parseInt(rawId, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateStoryPayload(body) {
  const {
    title,
    petName         = null,
    petType         = null,
    city            = null,
    storyText,
    mediaType       = 'none',
    mediaUrl        = null,
    contentLanguage = 'en',
    status,
  } = body ?? {};

  const errors = [];

  if (!title?.trim())     errors.push('title is required');
  if (!storyText?.trim()) errors.push('storyText is required');

  if (petType && !ALLOWED_PET_TYPES.includes(petType))
    errors.push(`petType must be one of: ${ALLOWED_PET_TYPES.join(', ')}`);

  if (!ALLOWED_MEDIA_TYPES.includes(mediaType))
    errors.push(`mediaType must be one of: ${ALLOWED_MEDIA_TYPES.join(', ')}`);

  if (contentLanguage && !ALLOWED_LANGUAGES.includes(contentLanguage))
    errors.push(`contentLanguage must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);

  if ((mediaType === 'image' || mediaType === 'video') && !mediaUrl?.trim())
    errors.push('mediaUrl is required when mediaType is image or video');

  if (status !== undefined && !String(status).trim())
    errors.push('status must not be empty');

  return {
    errors,
    values: {
      title, petName, petType, city, storyText,
      mediaType, mediaUrl: mediaType === 'none' ? (mediaUrl ?? null) : mediaUrl,
      contentLanguage, status,
    },
  };
}

function toApiShape(row) {
  return {
    id:              row.id,
    title:           row.title,
    petName:         row.pet_name,
    petType:         row.pet_type,
    city:            row.city,
    storyText:       row.story_text,
    mediaType:       row.media_type,
    mediaUrl:        row.media_url,
    contentLanguage: row.content_language,
    status:          row.status,
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

async function getStories(req, res) {
  try {
    const [rows] = await pool.query(BASE_SELECT + ' ORDER BY created_at DESC');
    res.json(rows.map(toApiShape));
  } catch (err) {
    console.error('getStories error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch stories' });
  }
}

async function getStory(req, res) {
  const id = validateStoryId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid story id' });

  try {
    const row = await fetchById(id);
    if (!row) return res.status(404).json({ status: 'error', message: 'Story not found' });
    res.json(toApiShape(row));
  } catch (err) {
    console.error('getStory error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch story' });
  }
}

async function createStory(req, res) {
  const { errors, values } = validateStoryPayload(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO pet_stories
         (title, pet_name, pet_type, city, story_text, media_type, media_url, content_language, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.title, values.petName, values.petType, values.city, values.storyText,
        values.mediaType, values.mediaUrl, values.contentLanguage, values.status ?? 'published',
      ]
    );

    const created = await fetchById(result.insertId);
    res.status(201).json(toApiShape(created));
  } catch (err) {
    console.error('createStory error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to create story' });
  }
}

async function updateStory(req, res) {
  const id = validateStoryId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid story id' });

  const { errors, values } = validateStoryPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const existing = await fetchById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Story not found' });

    await pool.query(
      `UPDATE pet_stories SET
         title = ?, pet_name = ?, pet_type = ?, city = ?, story_text = ?,
         media_type = ?, media_url = ?, content_language = ?, status = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        values.title,
        values.petName,
        values.petType,
        values.city,
        values.storyText,
        values.mediaType,
        values.mediaUrl,
        values.contentLanguage,
        values.status ?? existing.status,
        id,
      ]
    );

    const updated = await fetchById(id);
    res.json(toApiShape(updated));
  } catch (err) {
    console.error('updateStory error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to update story' });
  }
}

async function deleteStory(req, res) {
  const id = validateStoryId(req.params.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid story id' });

  try {
    const existing = await fetchById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Story not found' });

    await pool.query(
      'UPDATE pet_stories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    res.json({ status: 'ok', message: 'Story deleted', id });
  } catch (err) {
    console.error('deleteStory error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete story' });
  }
}

module.exports = { getStories, getStory, createStory, updateStory, deleteStory };
