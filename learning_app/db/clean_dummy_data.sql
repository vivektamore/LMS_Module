-- ============================================================================
-- LEARNING APP — CLEAN DUMMY & TEST DATA
-- Database: learning_app_db
-- ============================================================================
-- You can run this script directly in MySQL Workbench, phpMyAdmin, or terminal:
-- mysql -u root -p learning_app_db < db/clean_dummy_data.sql
-- ============================================================================

USE learning_app_db;

-- Temporarily disable foreign key checks and safe update mode for clean execution
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- ----------------------------------------------------------------------------
-- STEP 1: Delete all test/activity logs (Watch time, Progress, Certificates, Enrollments)
-- ----------------------------------------------------------------------------
TRUNCATE TABLE video_watch_time;
TRUNCATE TABLE lesson_progress;
TRUNCATE TABLE certificates;
TRUNCATE TABLE enrollments;

-- ----------------------------------------------------------------------------
-- STEP 2: Delete test/dummy courses, modules, lessons, and quizzes
-- Note: If you want to delete ALL test courses, uncomment the lines below:
-- ----------------------------------------------------------------------------
TRUNCATE TABLE lesson_quizzes;
TRUNCATE TABLE lessons;
TRUNCATE TABLE modules;
TRUNCATE TABLE course_departments;
TRUNCATE TABLE courses;
TRUNCATE TABLE categories;

-- ----------------------------------------------------------------------------
-- STEP 3: Delete user accounts
-- ----------------------------------------------------------------------------
-- Option A: Delete only dummy test accounts (keeping real accounts):
-- DELETE FROM users WHERE email LIKE '%example.com%' OR email LIKE '%test%';

-- Option B: Delete ALL user and admin accounts (complete user wipeout):
TRUNCATE TABLE users;

-- Re-enable foreign key constraints and safe update mode
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ----------------------------------------------------------------------------
-- STEP 4: Confirm remaining clean state
-- ----------------------------------------------------------------------------
SELECT 'USERS REMAINING' AS Table_Name, COUNT(*) AS Record_Count FROM users
UNION ALL
SELECT 'COURSES REMAINING', COUNT(*) FROM courses
UNION ALL
SELECT 'ENROLLMENTS REMAINING', COUNT(*) FROM enrollments
UNION ALL
SELECT 'WATCH TIME LOGS', COUNT(*) FROM video_watch_time
UNION ALL
SELECT 'CERTIFICATES REMAINING', COUNT(*) FROM certificates;
