const express = require('express');
const router = express.Router();
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} = require('../controllers/listings.controller');

router.get('/',       getListings);
router.get('/:id',    getListing);
router.post('/',      createListing);
router.put('/:id',    updateListing);
router.delete('/:id', deleteListing);

module.exports = router;
