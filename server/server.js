require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const listingsRoutes = require('./routes/listings.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/listings', listingsRoutes);

app.listen(PORT, () => {
  console.log(`Pet Friends API running at http://localhost:${PORT}`);
});
