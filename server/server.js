require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const healthRoutes   = require('./routes/health.routes');
const listingsRoutes = require('./routes/listings.routes');
const uploadsRoutes  = require('./routes/uploads.routes');
const storiesRoutes  = require('./routes/stories.routes');

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

app.listen(PORT, () => {
  console.log(`Pet Friends API running at http://localhost:${PORT}`);
});
