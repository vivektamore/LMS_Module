
USE learning_app_db;

-- 1. Add department column to users table
ALTER TABLE users
  ADD COLUMN department ENUM(
    'HR','SAFETY','MAINTENANCE','PRODUCTION','QUALITY',
    'DESIGN','DEVELOPMENT','IT','AI',
    'CENTRAL_PROCESSING_ENGINEERING','STORE','DISPATCH'
  ) NULL AFTER role;

-- 2. Add visibility and has_certificate to courses table
ALTER TABLE courses
  ADD COLUMN visibility      ENUM('all', 'specific') NOT NULL DEFAULT 'all'  AFTER created_by,
  ADD COLUMN has_certificate BOOLEAN                 NOT NULL DEFAULT FALSE   AFTER visibility;

-- 3. Create course_departments table
CREATE TABLE IF NOT EXISTS course_departments (
  course_id  VARCHAR(36) NOT NULL,
  department VARCHAR(50) NOT NULL,
  PRIMARY KEY (course_id, department),
  CONSTRAINT fk_cd_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create video_watch_time table
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

-- 5. Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id        VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id   VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  issued_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cert_user_course (user_id, course_id),
  CONSTRAINT fk_cert_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add indexes (MySQL 8.0 compatible — no IF NOT EXISTS on indexes)
CREATE INDEX idx_course_departments_course_id ON course_departments(course_id);
CREATE INDEX idx_watch_time_user_id           ON video_watch_time(user_id);
CREATE INDEX idx_watch_time_lesson_id         ON video_watch_time(lesson_id);
CREATE INDEX idx_certificates_user_id         ON certificates(user_id);
CREATE INDEX idx_certificates_course_id       ON certificates(course_id);

SELECT 'Migration v2 complete!' AS status;
