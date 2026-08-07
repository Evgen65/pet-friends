const mysql = require('mysql2/promise');

// DB_SSL is opt-in and false by default — local MySQL normally has no TLS
// listener configured, so defaulting to true would break local development.
// Cloud MySQL providers that require TLS (PlanetScale, RDS, Azure, ...) can
// set DB_SSL=true; rejectUnauthorized stays true so a misconfigured/expired
// cert fails loudly instead of silently connecting insecurely.
const useSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pet_friends',
  waitForConnections: true,
  connectionLimit: 10,
  ...(useSSL ? { ssl: { rejectUnauthorized: true } } : {}),
});

async function testConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0];
}

module.exports = { pool, testConnection };
