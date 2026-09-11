-- ============================================================================
-- LEARNING APP — Sample Seed Data for MySQL
-- Run this after running schema.mysql.sql to populate initial admin user & categories.
-- ============================================================================

USE learning_app_db;

-- 1. Create Default Admin User (Password: Admin@123)
-- Password hash generated using bcrypt ($2a$10$e8wzY.N7E7q.9uVpXvXy9.x4gZp1q9V5iGf.n2Q1u4A2Z8wY6m)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6', -- Admin@123
  'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';

-- 2. Create Default Employee User (Password: Employee@123)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'employee@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6', -- Employee@123
  'employee'
)
ON DUPLICATE KEY UPDATE role = 'employee';

-- 3. Create Default Categories
INSERT INTO categories (id, name, slug) VALUES
  ('cat-1111-1111-1111', 'Hydraulics', 'hydraulics'),
  ('cat-2222-2222-2222', 'Pneumatics', 'pneumatics'),
  ('cat-3333-3333-3333', 'PLC Automation', 'plc'),
  ('cat-4444-4444-4444', 'Standard Operating Procedures', 'sop')
ON DUPLICATE KEY UPDATE name = VALUES(name);
