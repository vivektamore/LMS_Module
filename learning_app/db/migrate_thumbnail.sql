-- ============================================================================
-- Migration: Add thumbnail_url column to courses table
-- Run once on your live MySQL database
-- ============================================================================

ALTER TABLE courses
  ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER description;

SELECT 'Migration complete: thumbnail_url column added to courses.' AS status;
