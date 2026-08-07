-- Pet Friends — MySQL initialization script
-- Run this manually in MySQL Workbench or any MySQL client before starting the server.
-- Requires MySQL 8.0.16+ (CHECK constraints are enforced from 8.0.16).

CREATE DATABASE IF NOT EXISTS pet_friends
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pet_friends;

CREATE TABLE IF NOT EXISTS listings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  scenario         ENUM('found', 'lost', 'for_home', 'adopt') NOT NULL,
  pet_type         ENUM('cat', 'dog', 'bird', 'rabbit', 'other') NOT NULL,
  pet_name_or_title VARCHAR(255) NOT NULL,
  breed            VARCHAR(100) NULL,
  city             VARCHAR(120) NOT NULL,
  event_date       DATE NULL,
  description      TEXT NOT NULL,
  contact_email    VARCHAR(255) NULL,
  contact_phone    VARCHAR(50) NULL,
  status           VARCHAR(50) NOT NULL DEFAULT 'open',
  content_language ENUM('en', 'ru', 'he') NOT NULL DEFAULT 'en',
  photo_url        VARCHAR(500) NULL,
  photo_public_id  VARCHAR(255) NULL,
  created_by_user_id INT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_listings_created_by_user_id (created_by_user_id)
);

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

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  status        ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE listings
  ADD CONSTRAINT fk_listings_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL;
