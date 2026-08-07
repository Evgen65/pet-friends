'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');

const { uploadListingPhoto } = require('../services/upload.service');

const router = express.Router();

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// ── Multer configuration ─────────────────────────────────────────────────────
// Memory storage: the upload service decides where the bytes end up (local
// disk vs. Cloudinary) — no temp file is ever written, so there is nothing
// to clean up after a failed or successful upload.

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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── POST /api/uploads/photos ─────────────────────────────────────────────────

router.post('/photos', (req, res) => {
  upload.single('photo')(req, res, async err => {
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

    try {
      const result = await uploadListingPhoto(req.file);
      res.status(201).json({
        status:   'ok',
        photoUrl: result.photoUrl,
        provider: result.provider,
        publicId: result.publicId,
      });
    } catch (uploadErr) {
      if (uploadErr.code === 'CLOUDINARY_NOT_CONFIGURED') {
        console.error('Upload error: Cloudinary is not configured (missing CLOUDINARY_* env vars)');
        return res.status(500).json({ status: 'error', message: 'Photo storage is not configured' });
      }
      console.error('Upload error:', uploadErr.message);
      res.status(500).json({ status: 'error', message: 'Failed to upload photo' });
    }
  });
});

module.exports = router;
