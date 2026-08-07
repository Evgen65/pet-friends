const mysql = require('mysql2/promise');

// DB_SSL is opt-in and false by default — local MySQL normally has no TLS
// listener configured, so defaulting to true would break local development.
// Cloud MySQL providers that require TLS (PlanetScale, RDS, Azure, Aiven, ...)
// can set DB_SSL=true; rejectUnauthorized stays true so a misconfigured/expired
// cert fails loudly instead of silently connecting insecurely.
const useSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

// DB_SSL_CA_BASE64 is the base64-encoded CA certificate for providers (e.g.
// Aiven) whose server cert chains to a private/self-signed CA that Node's
// default trust store doesn't know — without it, mysql2 rejects the
// connection with "self-signed certificate in certificate chain" even though
// rejectUnauthorized:true is the correct, secure setting.
// Temporary diagnostics for the Aiven "self-signed certificate in
// certificate chain" issue — logs shape/length info only, never secrets or
// certificate content. Runs once at module load (pool creation), not per
// request. Safe to remove once the SSL handshake is confirmed working.
function buildSslConfig() {
  if (!useSSL) {
    console.log('[db-ssl] DB_SSL=false — ssl disabled');
    return undefined;
  }

  const caBase64 = process.env.DB_SSL_CA_BASE64;
  const caBase64Present = Boolean(caBase64);
  console.log(
    `[db-ssl] DB_SSL=true; DB_SSL_CA_BASE64 present=${caBase64Present}, ` +
    `length=${caBase64Present ? caBase64.length : 0}`
  );

  if (caBase64) {
    const ca = Buffer.from(caBase64, 'base64').toString('utf8');
    console.log(
      `[db-ssl] decoded CA length=${ca.length}, ` +
      `hasBeginMarker=${ca.includes('BEGIN CERTIFICATE')}, ` +
      `hasEndMarker=${ca.includes('END CERTIFICATE')}`
    );
    console.log('[db-ssl] mode: ssl ca with rejectUnauthorized true');
    return { ca, rejectUnauthorized: true };
  }

  console.warn(
    'DB_SSL=true but DB_SSL_CA_BASE64 is not set — connecting without a ' +
    'custom CA. This will fail against providers whose cert chains to a ' +
    'private CA (e.g. Aiven) with "self-signed certificate in certificate chain".'
  );
  console.log('[db-ssl] mode: ssl rejectUnauthorized true without ca');
  return { rejectUnauthorized: true };
}

const sslConfig = buildSslConfig();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pet_friends',
  waitForConnections: true,
  connectionLimit: 10,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

async function testConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0];
}

module.exports = { pool, testConnection };
