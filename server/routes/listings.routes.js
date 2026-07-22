const express = require('express');
const router = express.Router();
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  requireListingOwnerOrAdmin,
} = require('../controllers/listings.controller');
const { optionalAuthenticateToken, authenticateToken } = require('../middleware/auth.middleware');

router.get('/',       optionalAuthenticateToken, getListings);
router.get('/:id',    optionalAuthenticateToken, getListing);
router.post('/',      optionalAuthenticateToken, createListing);
router.put('/:id',    authenticateToken, requireListingOwnerOrAdmin, updateListing);
router.delete('/:id', authenticateToken, requireListingOwnerOrAdmin, deleteListing);

module.exports = router;
