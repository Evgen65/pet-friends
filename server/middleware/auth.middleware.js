const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

// Fails loudly rather than silently falling back to an insecure default —
// an auth system with a guessable secret is worse than one that refuses to run.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

// Verifies a Bearer token and loads the password-hash-free user from the
// database. Returns { ok: true, user } on success, or { ok: false, status,
// message } on any failure (missing/invalid/expired token, blocked/missing
// user, config error) so callers can decide how strict to be about the result.
async function resolveTokenUser(req) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (err.message === 'JWT_SECRET is not configured') {
      console.error('resolveTokenUser config error:', err.message);
      return { ok: false, status: 500, message: 'Server configuration error' };
    }
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, role, status FROM users WHERE id = ?',
    [payload.userId]
  );
  const user = rows[0];

  // Treat "no longer exists" and "blocked" the same as "not authenticated" —
  // this endpoint should not reveal account state to a caller with a stale token.
  if (!user || user.status !== 'active') {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  return { ok: true, user };
}

// Used by GET /api/auth/me and other routes that require a signed-in user.
async function authenticateToken(req, res, next) {
  try {
    const result = await resolveTokenUser(req);
    if (!result.ok) {
      return res.status(result.status).json({ status: 'error', message: result.message });
    }
    req.user = result.user;
    next();
  } catch (err) {
    console.error('authenticateToken error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to authenticate request' });
  }
}

// Used by routes that work for both guests and signed-in users (e.g. listing
// creation/browsing). A missing Authorization header leaves req.user
// undefined and continues as a guest. A present-but-invalid/expired token is
// still rejected with 401 — silently ignoring a bad token would hide a
// caller's broken auth state instead of surfacing it.
async function optionalAuthenticateToken(req, res, next) {
  if (!req.headers.authorization) {
    return next();
  }

  try {
    const result = await resolveTokenUser(req);
    if (!result.ok) {
      return res.status(result.status).json({ status: 'error', message: result.message });
    }
    req.user = result.user;
    next();
  } catch (err) {
    console.error('optionalAuthenticateToken error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to authenticate request' });
  }
}

// Must run after authenticateToken (req.user is required). A missing
// req.user means the caller wasn't authenticated at all (401); an
// authenticated non-admin gets 403.
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  next();
}

module.exports = { authenticateToken, optionalAuthenticateToken, requireAdmin, getJwtSecret };
