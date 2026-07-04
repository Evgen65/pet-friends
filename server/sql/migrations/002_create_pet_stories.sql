-- Migration 002: create pet_stories table
-- Run this once in MySQL Workbench (or any MySQL client) against an existing pet_friends database.
-- New databases created from init.sql already include this table.
--
-- Usage:
--   USE pet_friends;
--   SOURCE server/sql/migrations/002_create_pet_stories.sql;

USE pet_friends;

CREATE TABLE IF NOT EXISTS pet_stories (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  pet_name         VARCHAR(120) NULL,
  pet_type         ENUM('cat', 'dog', 'bird', 'rabbit', 'other') NULL,
  city             VARCHAR(120) NULL,
  story_text       TEXT NOT NULL,
  media_type       ENUM('image', 'video', 'none') NOT NULL DEFAULT 'none',
  media_url        VARCHAR(500) NULL,
  content_language ENUM('en', 'ru', 'he') NOT NULL DEFAULT 'en',
  status           VARCHAR(50) NOT NULL DEFAULT 'published',
  deleted_at       TIMESTAMP NULL DEFAULT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
