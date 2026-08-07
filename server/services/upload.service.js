'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Pet Friends — Listing photo upload service
//
// Two providers, selected by UPLOAD_PROVIDER:
//   "local"      (default) — write the file to disk under UPLOAD_DIR and
//                 return a relative /uploads/listings/... URL, same as
//                 the original multer-only implementation.
//   "cloudinary" — upload the buffer to Cloudinary and return its
//                 absolute secure_url + public_id.
//
// Both providers receive an in-memory multer file (buffer, no temp file on
// disk), so there is nothing to clean up after a failed or successful upload.
// ─────────────────────────────────────────────────────────────────────────────

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(path.join(__dirname, '..', '..'), process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads', 'listings');

// MIME type → canonical stored extension (mirrors uploads.routes.js validation).
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

function getProvider() {
  const raw = (process.env.UPLOAD_PROVIDER || 'local').trim().toLowerCase();
  return raw === 'cloudinary' ? 'cloudinary' : 'local';
}

// ── Local provider ───────────────────────────────────────────────────────────

async function uploadLocal(file) {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

  const ext      = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase();
  const random   = crypto.randomBytes(3).toString('hex');
  const filename = `listing-${Date.now()}-${random}${ext}`;

  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);

  return {
    photoUrl: `/uploads/listings/${filename}`,
    provider: 'local',
    publicId: null,
  };
}

// ── Cloudinary provider ──────────────────────────────────────────────────────

function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Configures the SDK from either CLOUDINARY_URL or the three discrete vars —
// called once per upload (cheap, and picks up any env change without a restart).
function configureCloudinary() {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) {
    cloudinary.config({ secure: true }); // reads CLOUDINARY_URL from env automatically
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

function uploadCloudinary(file) {
  if (!isCloudinaryConfigured()) {
    const err = new Error('Cloudinary is not configured');
    err.code  = 'CLOUDINARY_NOT_CONFIGURED';
    throw err;
  }

  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        process.env.CLOUDINARY_FOLDER || 'pet-friends/listings',
        resource_type: 'image',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          photoUrl: result.secure_url,
          provider: 'cloudinary',
          publicId: result.public_id ?? null,
        });
      }
    );
    Readable.from(file.buffer).pipe(uploadStream);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

async function uploadListingPhoto(file) {
  return getProvider() === 'cloudinary' ? uploadCloudinary(file) : uploadLocal(file);
}

module.exports = { uploadListingPhoto, getProvider };
