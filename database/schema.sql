-- ============================================================
-- Subscription-Based Membership Engine
-- Database Schema & Sample Data
-- ============================================================
-- Run this script to create the database, tables, and seed data.
-- MySQL 8.0+ recommended
-- ============================================================

-- Create database
CREATE DATABASE IF NOT EXISTS membership_engine;
USE membership_engine;

-- ============================================================
-- USERS TABLE
-- Stores all registered users with hashed passwords
-- role: 'user' (default) or 'admin'
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PLANS TABLE
-- Defines subscription tiers with access control parameters
--
-- TIER LOGIC:
-- access_level is the KEY field for tier-based access control.
-- Routes require a minimum access_level to access.
-- Higher tiers (higher access_level) inherit access to lower-tier content.
--
-- Example:
--   Basic (1)      → /basic-content ✅ | /premium-content ❌ | /enterprise-content ❌
--   Premium (2)    → /basic-content ✅ | /premium-content ✅ | /enterprise-content ❌
--   Enterprise (3) → /basic-content ✅ | /premium-content ✅ | /enterprise-content ✅
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  max_download_limit INT NOT NULL DEFAULT 0,
  priority_support BOOLEAN DEFAULT FALSE,
  access_level INT NOT NULL DEFAULT 1,
  INDEX idx_access_level (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- Links users to plans with time tracking and usage data
--
-- LIFECYCLE:
-- status: 'active' → User can access content based on plan tier
--         'expired' → Auto-set when end_date < today (checked by expiryMiddleware)
--         'cancelled' → Manually cancelled by admin or user
--
-- download_count: Tracks downloads against plan's max_download_limit
-- Resets to 0 on plan change or renewal
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  download_count INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA: Subscription Plans
-- ============================================================
INSERT INTO plans (plan_name, price, max_download_limit, priority_support, access_level) VALUES
  ('Basic', 9.99, 50, FALSE, 1),
  ('Premium', 29.99, 500, TRUE, 2),
  ('Enterprise', 99.99, 0, TRUE, 3);
-- Note: Enterprise max_download_limit = 0 means UNLIMITED downloads

-- ============================================================
-- SEED DATA: Sample Users
-- Password for all sample users: "password123"
-- Hash generated with bcrypt (12 rounds)
-- In production, NEVER store plain-text passwords
-- ============================================================
-- NOTE: You should register users through the API instead.
-- These are provided only for testing convenience.
-- The hash below is for "password123" with bcrypt 12 rounds:
-- $2a$12$LJ3m4ys3FnZETvH7NJxbReMbMNELCnKfCpq0dcYbrjm2NJQR5r6.2

INSERT INTO users (name, email, password, role) VALUES
  ('Admin User', 'admin@example.com', '$2a$12$LJ3m4ys3FnZETvH7NJxbReMbMNELCnKfCpq0dcYbrjm2NJQR5r6.2', 'admin'),
  ('John Doe', 'john@example.com', '$2a$12$LJ3m4ys3FnZETvH7NJxbReMbMNELCnKfCpq0dcYbrjm2NJQR5r6.2', 'user'),
  ('Jane Smith', 'jane@example.com', '$2a$12$LJ3m4ys3FnZETvH7NJxbReMbMNELCnKfCpq0dcYbrjm2NJQR5r6.2', 'user'),
  ('Bob Wilson', 'bob@example.com', '$2a$12$LJ3m4ys3FnZETvH7NJxbReMbMNELCnKfCpq0dcYbrjm2NJQR5r6.2', 'user');

-- ============================================================
-- SEED DATA: Sample Subscriptions
-- ============================================================
INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, download_count) VALUES
  (2, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active', 5),     -- John → Basic
  (3, 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active', 12),    -- Jane → Premium
  (4, 3, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active', 0);     -- Bob → Enterprise
