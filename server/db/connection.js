const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pet_friends',
  waitForConnections: true,
  connectionLimit: 10,
});

async function testConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0];
}

module.exports = { pool, testConnection };
