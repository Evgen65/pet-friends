-- Migration 003: create users table
-- Run this once in MySQL Workbench (or any MySQL client) against an existing pet_friends database.
-- New databases created from init.sql already include this table.
--
-- Usage:
--   USE pet_friends;
--   SOURCE server/sql/migrations/003_create_users.sql;

USE pet_friends;

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
