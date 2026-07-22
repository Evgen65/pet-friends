-- Migration 004: add ownership column to listings
-- Run this once in MySQL Workbench (or any MySQL client) against an existing pet_friends database.
-- New databases created from init.sql already include this column.
--
-- Usage:
--   USE pet_friends;
--   SOURCE server/sql/migrations/004_add_owner_to_listings.sql;

USE pet_friends;

ALTER TABLE listings
  ADD COLUMN created_by_user_id INT NULL,
  ADD INDEX idx_listings_created_by_user_id (created_by_user_id),
  ADD CONSTRAINT fk_listings_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL;
