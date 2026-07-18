const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { signup, signin, me, signout } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Throttles brute-force password guessing against a single account/IP.
// Only applied to signin — signup/me/signout have no password-guessing surface.
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-in attempts. Please try again later.' },
});

router.post('/signup',  signup);
router.post('/signin',  signinLimiter, signin);
router.get('/me',       authenticateToken, me);
router.post('/signout', signout);

module.exports = router;
