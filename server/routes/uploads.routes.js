'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'listings');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// MIME type → canonical stored extension
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

// ── Multer configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const ext      = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const random   = crypto.randomBytes(3).toString('hex');
    const filename = `listing-${Date.now()}-${random}${ext}`;
    cb(null, filename);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
    cb(null, true);
  } else {
    const err  = new Error('Invalid file type');
    err.code   = 'INVALID_TYPE';
    cb(err);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── POST /api/uploads/photos ─────────────────────────────────────────────────

router.post('/photos', (req, res) => {
  upload.single('photo')(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: 'error', message: 'File is too large' });
      }
      if (err.code === 'INVALID_TYPE') {
        return res.status(400).json({ status: 'error', message: 'Invalid file type' });
      }
      console.error('Upload error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Failed to upload photo' });
    }

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Photo file is required' });
    }

    const photoUrl = `/uploads/listings/${req.file.filename}`;
    res.status(201).json({ status: 'ok', photoUrl });
  });
});

module.exports = router;
