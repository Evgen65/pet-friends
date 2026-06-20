const { pool } = require('../db/connection');

const ALLOWED_SCENARIOS = ['found', 'lost', 'for_home', 'adopt'];

function toApiShape(row) {
  return {
    id:             row.id,
    scenario:       row.scenario,
    petType:        row.pet_type,
    petNameOrTitle: row.pet_name_or_title,
    breed:          row.breed,
    city:           row.city,
    eventDate:      row.event_date,
    description:    row.description,
    contactEmail:   row.contact_email,
    contactPhone:   row.contact_phone,
    status:         row.status,
    contentLanguage: row.content_language,
    photoUrl:       row.photo_url,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

async function getListings(req, res) {
  const { scenario } = req.query;

  if (scenario !== undefined && !ALLOWED_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ status: 'error', message: 'Invalid scenario' });
  }

  try {
    let sql = `
      SELECT
        id, scenario, pet_type, pet_name_or_title, breed, city,
        DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, description, contact_email, contact_phone,
        status, content_language, photo_url, created_at, updated_at
      FROM listings
    `;
    const params = [];

    if (scenario) {
      sql += ' WHERE scenario = ?';
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

module.exports = { getListings };
