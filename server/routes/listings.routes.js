const express = require('express');
const router = express.Router();
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} = require('../controllers/listings.controller');
const { optionalAuthenticateToken } = require('../middleware/auth.middleware');

router.get('/',       optionalAuthenticateToken, getListings);
router.get('/:id',    optionalAuthenticateToken, getListing);
router.post('/',      optionalAuthenticateToken, createListing);
router.put('/:id',    updateListing);
router.delete('/:id', deleteListing);

module.exports = router;
