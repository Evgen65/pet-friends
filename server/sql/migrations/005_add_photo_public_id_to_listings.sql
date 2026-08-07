-- Migration 005: add nullable photo_public_id column to listings
-- Stores the Cloudinary public_id for listings uploaded via the Cloudinary
-- provider (Milestone 24). NULL for all existing rows and for any listing
-- uploaded via the local provider — nothing else needs to change to read it.
-- Run this once in MySQL Workbench (or any MySQL client) against an existing pet_friends database.
-- New databases created from init.sql already include this column.
--
-- Usage:
--   USE pet_friends;
--   SOURCE server/sql/migrations/005_add_photo_public_id_to_listings.sql;

USE pet_friends;

ALTER TABLE listings
  ADD COLUMN photo_public_id VARCHAR(255) NULL AFTER photo_url;
