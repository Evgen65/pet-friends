const express = require('express');
const router = express.Router();
const { getAdminListings, bulkDeleteListings } = require('../controllers/admin.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

router.get('/listings',        authenticateToken, requireAdmin, getAdminListings);
router.delete('/listings/bulk', authenticateToken, requireAdmin, bulkDeleteListings);

module.exports = router;
