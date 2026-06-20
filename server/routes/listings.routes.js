const express = require('express');
const router = express.Router();
const { getListings } = require('../controllers/listings.controller');

router.get('/', getListings);

module.exports = router;
