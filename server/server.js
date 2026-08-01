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

app.use(cors());
app.use(express.json());

// Serve uploaded files: server/uploads/ → /uploads/…
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/health',   healthRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/uploads',  uploadsRoutes);
app.use('/api/stories',  storiesRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);

// Auth endpoints depend on JWT_SECRET being set — fail fast at startup with a
// clear message instead of letting every signup/signin 500 with a confusing error.
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. Set it in your .env file before starting the server.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Pet Friends API running at http://localhost:${PORT}`);
});
