require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const healthRoutes   = require('./routes/health.routes');
const listingsRoutes = require('./routes/listings.routes');
const uploadsRoutes  = require('./routes/uploads.routes');
const storiesRoutes  = require('./routes/stories.routes');
const authRoutes     = require('./routes/auth.routes');
const adminRoutes    = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

const NODE_ENV      = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// ── Startup sanity checks ────────────────────────────────────────────────────
// Auth endpoints depend on JWT_SECRET being set — fail fast at startup with a
// clear message instead of letting every signup/signin 500 with a confusing error.
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. Set it in your .env file before starting the server.');
  process.exit(1);
}

// A placeholder secret is fine for local development, but running production
// with it defeats the point of having one — fail fast rather than silently
// signing tokens with a value anyone can read from .env.example.
if (IS_PRODUCTION && /^change_me/i.test(process.env.JWT_SECRET)) {
  console.error('JWT_SECRET is still set to its placeholder value. Set a strong, unique secret before running in production.');
  process.exit(1);
}

if (IS_PRODUCTION && !process.env.CORS_ORIGIN) {
  console.warn('CORS_ORIGIN is not set in production — falling back to local-development origins only. Set CORS_ORIGIN to your real frontend URL(s).');
}

if (IS_PRODUCTION && !process.env.DB_PASSWORD) {
  console.warn('DB_PASSWORD is not set — this is unsafe outside local development.');
}

// ── CORS ──────────────────────────────────────────────────────────────────
// CORS_ORIGIN is a comma-separated allowlist. When unset, fall back to the
// local frontend origins this project currently uses (Live Server / the
// Playwright static server) — never a wildcard, since requests carry a JWT
// in the Authorization header.
const DEFAULT_DEV_ORIGINS = ['http://127.0.0.1:5500', 'http://localhost:5500'];

function resolveAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (raw && raw.trim()) {
    return raw.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_DEV_ORIGINS;
}

const allowedOrigins = resolveAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    // No Origin header at all (curl, Postman, server-to-server) — allow.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

// Serve uploaded files: server/uploads/ → /uploads/…
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/health',   healthRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/uploads',  uploadsRoutes);
app.use('/api/stories',  storiesRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);

// ── Optional production static frontend serving ─────────────────────────────
// Local development keeps using Live Server / scripts/static-server.js —
// this only activates when NODE_ENV=production, and only ever serves the
// exact files/folders the frontend already loads (see index.html). It
// deliberately does NOT serve the project root wholesale, which would also
// expose server/, node_modules/, .env, docs/, and tests/ over HTTP.
// The frontend may also be deployed separately (e.g. static hosting/CDN)
// instead of relying on this — both are valid, nothing else depends on it.
if (IS_PRODUCTION) {
  const FRONTEND_ROOT = path.join(__dirname, '..');
  app.use('/scripts', express.static(path.join(FRONTEND_ROOT, 'scripts')));
  app.use('/assets',  express.static(path.join(FRONTEND_ROOT, 'assets')));
  ['index.html', 'app.js', 'styles.css'].forEach(file => {
    app.get('/' + file, (_req, res) => res.sendFile(path.join(FRONTEND_ROOT, file)));
  });
  app.get('/', (_req, res) => res.sendFile(path.join(FRONTEND_ROOT, 'index.html')));
}

// CORS rejections throw inside the `cors` origin callback above — without
// this handler Express's default error handler would return a raw 500.
app.use((err, _req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ status: 'error', message: 'Origin not allowed' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Pet Friends API running at http://localhost:${PORT} (${NODE_ENV})`);
});
