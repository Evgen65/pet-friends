-- Migration 001: add soft-delete column to listings
-- Run this once in MySQL Workbench (or any MySQL client) against an existing pet_friends database.
-- New databases created from init.sql already include this column.
--
-- Usage:
--   USE pet_friends;
--   SOURCE server/sql/migrations/001_add_deleted_at_to_listings.sql;

USE pet_friends;

ALTER TABLE listings
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
