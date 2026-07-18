const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { pool } = require('../db/connection');
const { getJwtSecret } = require('../middleware/auth.middleware');

const BCRYPT_ROUNDS = 10;
const EMAIL_RE       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN_LEN    = 2;
const NAME_MAX_LEN    = 120;
const PASSWORD_MIN_LEN = 8;

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateSignupPayload(body) {
  const { name, email, password } = body ?? {};
  const errors = [];

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    errors.push('Name is required');
  } else if (trimmedName.length < NAME_MIN_LEN || trimmedName.length > NAME_MAX_LEN) {
    errors.push(`Name must be between ${NAME_MIN_LEN} and ${NAME_MAX_LEN} characters`);
  }

  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmedEmail) {
    errors.push('Email is required');
  } else if (!EMAIL_RE.test(trimmedEmail)) {
    errors.push('Email must be a valid email address');
  }

  if (typeof password !== 'string' || !password) {
    errors.push('Password is required');
  } else if (password.length < PASSWORD_MIN_LEN) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LEN} characters`);
  }

  return { errors, values: { name: trimmedName, email: trimmedEmail, password } };
}

function validateSigninPayload(body) {
  const { email, password } = body ?? {};
  const errors = [];

  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmedEmail) errors.push('Email is required');

  if (typeof password !== 'string' || !password) errors.push('Password is required');

  return { errors, values: { email: trimmedEmail, password } };
}

function toSafeUser(row) {
  return {
    id:     row.id,
    name:   row.name,
    email:  row.email,
    role:   row.role,
    status: row.status,
  };
}

// JWT payload intentionally carries only non-sensitive, safe-to-decode data.
function signToken(user) {
  const secret    = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, secret, { expiresIn });
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function signup(req, res) {
  const { errors, values } = validateSignupPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [values.email]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(values.password, BCRYPT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [values.name, values.email, passwordHash]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = toSafeUser(rows[0]);

    let token;
    try {
      token = signToken(user);
    } catch (err) {
      console.error('signup token error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Server configuration error' });
    }

    res.status(201).json({ status: 'ok', user, token });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'Email already exists' });
    }
    console.error('signup error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to sign up' });
  }
}

async function signin(req, res) {
  const { errors, values } = validateSigninPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 'error', message: 'Validation error', details: errors });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?',
      [values.email]
    );
    const row = rows[0];

    // Same generic response whether the email doesn't exist or the password is
    // wrong — never reveal which one it was.
    if (!row) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(values.password, row.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    if (row.status === 'blocked') {
      return res.status(403).json({ status: 'error', message: 'This account has been blocked' });
    }

    const user = toSafeUser(row);

    let token;
    try {
      token = signToken(user);
    } catch (err) {
      console.error('signin token error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Server configuration error' });
    }

    res.json({ status: 'ok', user, token });
  } catch (err) {
    console.error('signin error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to sign in' });
  }
}

// Protected by authenticateToken — req.user is already the safe (no
// password_hash) shape loaded fresh from the database.
function me(req, res) {
  res.json({ status: 'ok', user: req.user });
}

// Stateless JWT MVP: there is no server-side session or token blacklist to
// clear, so this is a placeholder that always succeeds. The frontend is
// responsible for discarding its stored token.
// TODO(future milestone): to support real server-side revocation (e.g. a
// user was blocked mid-session), add a token blacklist/allowlist — a Redis
// set of revoked jti's, or a `token_version` column on users checked in
// authenticateToken — and verify it there.
function signout(_req, res) {
  res.json({ status: 'ok', message: 'Signed out' });
}

module.exports = { signup, signin, me, signout };
