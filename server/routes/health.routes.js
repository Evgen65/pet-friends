const express = require('express');
const router = express.Router();
const { testConnection } = require('../db/connection');

router.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'pet-friends-api' });
});

router.get('/db', async (_req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

module.exports = router;
