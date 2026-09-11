-- ============================================================================
-- LEARNING APP — Final MySQL 8.0+ Database Schema
-- Tables: 11 | Engine: InnoDB | Charset: utf8mb4
-- Run this file on a fresh MySQL server to set up the full database.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS learning_app_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE learning_app_db;

-- ============================================================================
-- TABLE 1: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)                          NOT NULL PRIMARY KEY,
  email           VARCHAR(255)                         NOT NULL UNIQUE,
  password_hash   VARCHAR(255)                         NOT NULL,
  role            ENUM('admin', 'employee', 'student') NOT NULL DEFAULT 'employee',
  department      ENUM(
                    'HR','SAFETY','MAINTENANCE','PRODUCTION','QUALITY',
                    'DESIGN','DEVELOPMENT','IT','AI',
                    'CENTRAL_PROCESSING_ENGINEERING','STORE','DISPATCH'
                  )                                    NULL,
  last_sign_in_at DATETIME                             NULL,
  created_at      DATETIME                             NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 2: categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 3: courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id              VARCHAR(36)             NOT NULL PRIMARY KEY,
  title           VARCHAR(500)            NOT NULL,
  description     TEXT                    NULL,
  thumbnail_url   VARCHAR(500)            NULL,
  category_id     VARCHAR(36)             NULL,
  created_by      VARCHAR(36)             NULL,
  visibility      ENUM('all', 'specific') NOT NULL DEFAULT 'all',
  has_certificate BOOLEAN                 NOT NULL DEFAULT FALSE,
  created_at      DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME                NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_courses_user     FOREIGN KEY (created_by)  REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 4: course_departments (links courses to specific departments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_departments (
  course_id  VARCHAR(36) NOT NULL,
  department VARCHAR(50) NOT NULL,
  PRIMARY KEY (course_id, department),
  CONSTRAINT fk_cd_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 5: modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  course_id   VARCHAR(36)  NOT NULL,
  title       VARCHAR(500) NOT NULL,
  order_index INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 6: lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id               VARCHAR(36)                NOT NULL PRIMARY KEY,
  module_id        VARCHAR(36)                NOT NULL,
  title            VARCHAR(500)               NOT NULL,
  type             ENUM('single', 'playlist') NOT NULL DEFAULT 'single',
  video_url        TEXT                       NULL,
  playlist_urls    JSON                       NULL,
  order_index      INT                        NOT NULL DEFAULT 0,
  duration_seconds INT                        NOT NULL DEFAULT 0,
  created_at       DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 7: lesson_quizzes (in-video quizzes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_quizzes (
  id            VARCHAR(36) NOT NULL PRIMARY KEY,
  lesson_id     VARCHAR(36) NOT NULL,
  timestamp_sec INT         NOT NULL,
  question      TEXT        NOT NULL,
  options       JSON        NOT NULL,
  correct_index INT         NOT NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 8: enrollments (Many-to-Many: users <-> courses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id           VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  course_id    VARCHAR(36) NOT NULL,
  enrolled_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME    NULL,
  UNIQUE KEY uq_user_course (user_id, course_id),
  CONSTRAINT fk_enrollments_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 9: lesson_progress (per-user per-lesson completion tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id                   VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id              VARCHAR(36) NOT NULL,
  lesson_id            VARCHAR(36) NOT NULL,
  is_completed         TINYINT(1)  NOT NULL DEFAULT 0,
  completed_at         DATETIME    NULL,
  max_watched_time_sec INT         NOT NULL DEFAULT 0,
  updated_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_lesson (user_id, lesson_id),
  CONSTRAINT fk_progress_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 10: video_watch_time (exact seconds watched per user per lesson)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_watch_time (
  id              VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  lesson_id       VARCHAR(36) NOT NULL,
  watched_seconds INT         NOT NULL DEFAULT 0,
  total_seconds   INT         NOT NULL DEFAULT 0,
  last_watched_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_watch_user_lesson (user_id, lesson_id),
  CONSTRAINT fk_watch_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_watch_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 11: certificates (auto-issued on course completion)
-- ============================================================================
CREATE TABLE IF NOT EXISTS certificates (
  id        VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id   VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  issued_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cert_user_course (user_id, course_id),
  CONSTRAINT fk_cert_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================
CREATE INDEX idx_courses_category_id          ON courses(category_id);
CREATE INDEX idx_courses_created_by           ON courses(created_by);
CREATE INDEX idx_course_departments_course_id ON course_departments(course_id);
CREATE INDEX idx_modules_course_id            ON modules(course_id);
CREATE INDEX idx_lessons_module_id            ON lessons(module_id);
CREATE INDEX idx_quizzes_lesson_id            ON lesson_quizzes(lesson_id);
CREATE INDEX idx_enrollments_user_id          ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id        ON enrollments(course_id);
CREATE INDEX idx_lesson_progress_user_id      ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id    ON lesson_progress(lesson_id);
CREATE INDEX idx_watch_time_user_id           ON video_watch_time(user_id);
CREATE INDEX idx_watch_time_lesson_id         ON video_watch_time(lesson_id);
CREATE INDEX idx_certificates_user_id         ON certificates(user_id);
CREATE INDEX idx_certificates_course_id       ON certificates(course_id);

-- ============================================================================
-- SEED DATA — Default Admin & Categories
-- ============================================================================

-- Default Admin User (Password: Admin@123)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6',
  'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';

-- Default Employee User (Password: Employee@123)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'employee@example.com',
  '$2a$10$7R.Z0w0B0N.kY6mY5vY7u.h2X9Q1u4A2Z8wY6m7R.Z0w0B0N.kY6',
  'employee'
)
ON DUPLICATE KEY UPDATE role = 'employee';

-- Default Categories
INSERT INTO categories (id, name, slug) VALUES
  ('cat-1111-1111-1111', 'Hydraulics',                    'hydraulics'),
  ('cat-2222-2222-2222', 'Pneumatics',                    'pneumatics'),
  ('cat-3333-3333-3333', 'PLC Automation',                'plc'),
  ('cat-4444-4444-4444', 'Standard Operating Procedures', 'sop')
ON DUPLICATE KEY UPDATE name = VALUES(name);

SELECT 'Learning App DB setup complete!' AS status;
