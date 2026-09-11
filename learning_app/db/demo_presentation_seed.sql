-- ============================================================================
-- LEARNING APP — DEMO PRESENTATION SEED
-- Demonstrates: Single Video, Playlist, Department-Specific, Anti-Skip Quizzes
-- Run this on top of final_schema_server.sql (schema must already exist)
-- ============================================================================

USE learning_app_db;

-- ============================================================================
-- CLEAN PREVIOUS DEMO DATA (safe to re-run)
-- ============================================================================
DELETE FROM lesson_quizzes   WHERE lesson_id  IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN ('demo-course-1111','demo-course-2222','demo-course-3333')));
DELETE FROM lesson_progress  WHERE lesson_id  IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN ('demo-course-1111','demo-course-2222','demo-course-3333')));
DELETE FROM video_watch_time WHERE lesson_id  IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN ('demo-course-1111','demo-course-2222','demo-course-3333')));
DELETE FROM certificates     WHERE course_id  IN ('demo-course-1111','demo-course-2222','demo-course-3333');
DELETE FROM enrollments      WHERE course_id  IN ('demo-course-1111','demo-course-2222','demo-course-3333');
DELETE FROM lessons          WHERE module_id  IN (SELECT id FROM modules WHERE course_id IN ('demo-course-1111','demo-course-2222','demo-course-3333'));
DELETE FROM modules          WHERE course_id  IN ('demo-course-1111','demo-course-2222','demo-course-3333');
DELETE FROM course_departments WHERE course_id IN ('demo-course-1111','demo-course-2222','demo-course-3333');
DELETE FROM courses          WHERE id         IN ('demo-course-1111','demo-course-2222','demo-course-3333');

-- ============================================================================
-- COURSE 1: Single Video Lessons with Quizzes (Anti-Skip Demo)
-- Visibility: ALL departments  |  Category: Hydraulics
-- ============================================================================
INSERT INTO courses (id, title, description, category_id, created_by, visibility, has_certificate)
VALUES (
  'demo-course-1111',
  'Hydraulics Fundamentals',
  'Learn the core principles of hydraulic systems. Quiz checkpoints appear mid-video — employees cannot skip past them. A certificate is issued on full completion.',
  'cat-1111-1111-1111',
  '11111111-1111-1111-1111-111111111111',
  'all',
  1
);

INSERT INTO modules (id, course_id, title, order_index)
VALUES ('demo-mod-1001', 'demo-course-1111', 'Module 1: Introduction to Hydraulics', 0);

-- Lesson 1: Single video
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-1001',
  'demo-mod-1001',
  'Lesson 1: What is Hydraulic Pressure?',
  'single',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  NULL,
  0,
  596
);

-- Quiz at 10 seconds (anti-skip checkpoint 1)
INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
VALUES (
  'demo-quiz-1001',
  'demo-les-1001',
  10,
  'What is Pascal''s Law in hydraulics?',
  '["Pressure applied to a fluid is transmitted equally in all directions","Pressure increases as the pipe gets narrower","Fluid always flows from low to high pressure","Pressure only applies to gases"]',
  0
);

-- Quiz at 30 seconds (anti-skip checkpoint 2)
INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
VALUES (
  'demo-quiz-1002',
  'demo-les-1001',
  30,
  'Which unit is used to measure hydraulic pressure?',
  '["Watts (W)","Pascals (Pa) or Bar","Amperes (A)","Newton-metres (Nm)"]',
  1
);

-- Lesson 2: Single video
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-1002',
  'demo-mod-1001',
  'Lesson 2: Hydraulic Cylinders & Actuators',
  'single',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  NULL,
  1,
  653
);

-- Quiz at 15 seconds (anti-skip checkpoint 3)
INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
VALUES (
  'demo-quiz-1003',
  'demo-les-1002',
  15,
  'What is the function of a hydraulic cylinder?',
  '["Convert electrical energy to heat","Convert hydraulic pressure into linear mechanical force","Store hydraulic fluid","Filter hydraulic oil"]',
  1
);

-- ============================================================================
-- COURSE 2: PLAYLIST Lesson Demo
-- Visibility: ALL departments  |  Category: PLC Automation
-- ============================================================================
INSERT INTO courses (id, title, description, category_id, created_by, visibility, has_certificate)
VALUES (
  'demo-course-2222',
  'PLC Automation Essentials',
  'Covers Programmable Logic Controllers from basics to programming. Includes a Playlist lesson — multiple video segments grouped as a single lesson unit for continuous learning flow.',
  'cat-3333-3333-3333',
  '11111111-1111-1111-1111-111111111111',
  'all',
  1
);

INSERT INTO modules (id, course_id, title, order_index)
VALUES ('demo-mod-2001', 'demo-course-2222', 'Module 1: PLC Basics', 0);

-- Lesson 1: Single intro video with quiz
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-2001',
  'demo-mod-2001',
  'Lesson 1: Introduction to PLCs',
  'single',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  NULL,
  0,
  15
);

INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
VALUES (
  'demo-quiz-2001',
  'demo-les-2001',
  8,
  'What does PLC stand for?',
  '["Power Line Controller","Programmable Logic Controller","Pressure Load Circuit","Pneumatic Lever Control"]',
  1
);

-- Lesson 2: PLAYLIST TYPE — 3 video parts grouped in one lesson
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-2002',
  'demo-mod-2001',
  'Lesson 2: PLC Programming Series (Playlist — 3 Parts)',
  'playlist',
  NULL,
  '[{"title":"Part 1 — Ladder Logic Basics","url":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"},{"title":"Part 2 — Timer & Counter Functions","url":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"},{"title":"Part 3 — Output Coil Configuration","url":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"}]',
  1,
  180
);

-- Lesson 3: Single wrap-up video
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-2003',
  'demo-mod-2001',
  'Lesson 3: PLC Safety Interlocks',
  'single',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  NULL,
  2,
  15
);

-- ============================================================================
-- COURSE 3: DEPARTMENT-SPECIFIC — Safety SOP
-- Visibility: SPECIFIC — only SAFETY & MAINTENANCE can see this
-- ============================================================================
INSERT INTO courses (id, title, description, category_id, created_by, visibility, has_certificate)
VALUES (
  'demo-course-3333',
  'Machine Safety SOPs — Restricted Access',
  'Standard Operating Procedures for machine safety. This course is RESTRICTED — only visible to SAFETY and MAINTENANCE departments. Log in as hr@example.com to confirm it is hidden.',
  'cat-4444-4444-4444',
  '11111111-1111-1111-1111-111111111111',
  'specific',
  1
);

-- Department restrictions
INSERT INTO course_departments (course_id, department) VALUES ('demo-course-3333', 'SAFETY');
INSERT INTO course_departments (course_id, department) VALUES ('demo-course-3333', 'MAINTENANCE');

INSERT INTO modules (id, course_id, title, order_index)
VALUES ('demo-mod-3001', 'demo-course-3333', 'Module 1: Emergency Stop Procedures', 0);

-- Lesson 1: Single safety video with quiz
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-3001',
  'demo-mod-3001',
  'Lesson 1: Lockout Tagout (LOTO) Procedure',
  'single',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  NULL,
  0,
  60
);

INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
VALUES (
  'demo-quiz-3001',
  'demo-les-3001',
  10,
  'What is the first step in the LOTO procedure?',
  '["Start the machine to drain residual energy","Notify the supervisor","Isolate the energy source and apply a lock","Remove all guards"]',
  2
);

-- Lesson 2: Playlist safety videos
INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
VALUES (
  'demo-les-3002',
  'demo-mod-3001',
  'Lesson 2: PPE Usage Guidelines (Playlist)',
  'playlist',
  NULL,
  '[{"title":"Part 1 — Head & Eye Protection","url":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"},{"title":"Part 2 — Hand & Foot Protection","url":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4"}]',
  1,
  880
);

-- ============================================================================
-- DEMO USERS
-- ============================================================================

-- SAFETY dept user — sees all 3 courses
INSERT INTO users (id, email, password_hash, role, department)
VALUES (
  'demo-user-safety-001',
  'safety@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6',
  'employee',
  'SAFETY'
)
ON DUPLICATE KEY UPDATE department = 'SAFETY';

-- HR dept user — sees only 2 courses (Course 3 is hidden from HR)
INSERT INTO users (id, email, password_hash, role, department)
VALUES (
  'demo-user-hr-001',
  'hr@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6',
  'employee',
  'HR'
)
ON DUPLICATE KEY UPDATE department = 'HR';

-- ============================================================================
SELECT 'Demo seed loaded!' AS status;
SELECT '  Course 1 — Hydraulics (All Depts + 3 Anti-Skip Quizzes + Certificate)' AS notes
UNION ALL SELECT '  Course 2 — PLC Automation (All Depts + Playlist Lesson with 3 parts + Certificate)'
UNION ALL SELECT '  Course 3 — Safety SOP (SAFETY+MAINTENANCE only — hidden from HR)'
UNION ALL SELECT ''
UNION ALL SELECT '  safety@example.com  (dept: SAFETY)  — sees all 3 courses'
UNION ALL SELECT '  hr@example.com      (dept: HR)      — sees only courses 1 & 2'
UNION ALL SELECT '  Password for both: Employee@123';
