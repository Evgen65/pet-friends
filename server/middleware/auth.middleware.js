const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

// Fails loudly rather than silently falling back to an insecure default —
// an auth system with a guessable secret is worse than one that refuses to run.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

// Verifies the Bearer token, loads the user from the database, and attaches
// a password-hash-free user object to req.user. Used by GET /api/auth/me now,
// and intended for protecting listing/story routes in a future milestone.
async function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (err.message === 'JWT_SECRET is not configured') {
      console.error('authenticateToken config error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Server configuration error' });
    }
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [payload.userId]
    );
    const user = rows[0];

    // Treat "no longer exists" and "blocked" the same as "not authenticated" —
    // this endpoint should not reveal account state to a caller with a stale token.
    if (!user || user.status !== 'active') {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('authenticateToken error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to authenticate request' });
  }
}

module.exports = { authenticateToken, getJwtSecret };
