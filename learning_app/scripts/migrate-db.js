/**
 * Database Migration Script
 * Safely adds any missing columns and tables to an existing database
 * without losing any data.
 *
 * Usage:
 *   node scripts/migrate-db.js
 *   or: npm run migrate
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load .env.local if present
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    });
}

const host = process.env.MYSQL_HOST || '127.0.0.1';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '12345';
const database = process.env.MYSQL_DATABASE || 'learning_app_db';

async function migrate() {
  console.log('Connecting to MySQL on', `${host}:${port}`, 'database:', database);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  console.log('\n--- Checking & Applying Schema Migrations ---\n');

  // Helper to check if column exists
  async function ensureColumn(table, column, definition) {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [database, table, column]
    );

    if (cols.length === 0) {
      console.log(`+ Adding column \`${column}\` to table \`${table}\`...`);
      try {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`  ✓ Added \`${column}\` to \`${table}\``);
      } catch (err) {
        console.error(`  ✗ Error adding \`${column}\` to \`${table}\`:`, err.message);
      }
    } else {
      console.log(`  ✓ Column \`${table}.${column}\` exists`);
    }
  }

  // 1. Users Table Columns
  console.log('\n[1/7] Checking `users` table...');
  await ensureColumn('users', 'name', 'VARCHAR(255) NULL');
  await ensureColumn('users', 'employee_id', 'VARCHAR(50) NULL');
  await ensureColumn(
    'users',
    'department',
    "ENUM('HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY', 'DESIGN', 'DEVELOPMENT', 'IT', 'AI', 'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH') NULL"
  );
  await ensureColumn('users', 'role', "ENUM('admin', 'employee', 'student') NOT NULL DEFAULT 'employee'");
  await ensureColumn('users', 'created_by', 'VARCHAR(36) NULL');
  await ensureColumn('users', 'last_sign_in_at', 'DATETIME NULL');

  // Backfill names from email if null
  await conn.query(`
    UPDATE users 
    SET name = CONCAT(
      UPPER(SUBSTRING(SUBSTRING_INDEX(email, '@', 1), 1, 1)),
      LOWER(SUBSTRING(SUBSTRING_INDEX(email, '@', 1), 2))
    )
    WHERE (name IS NULL OR name = '') AND email IS NOT NULL
  `);

  // 2. Courses Table Columns
  console.log('\n[2/7] Checking `courses` table...');
  await ensureColumn('courses', 'course_code', 'VARCHAR(50) NULL');
  await ensureColumn('courses', 'description', 'TEXT NULL');
  await ensureColumn('courses', 'thumbnail_url', 'VARCHAR(500) NULL');
  await ensureColumn('courses', 'category_id', 'VARCHAR(36) NULL');
  await ensureColumn('courses', 'created_by', 'VARCHAR(36) NULL');
  await ensureColumn('courses', 'visibility', "ENUM('all', 'specific') NOT NULL DEFAULT 'all'");
  await ensureColumn('courses', 'has_certificate', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('courses', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 3. Lessons Table Columns
  console.log('\n[3/7] Checking `lessons` table...');
  await ensureColumn('lessons', 'type', "ENUM('single', 'playlist') NOT NULL DEFAULT 'single'");
  await ensureColumn('lessons', 'video_url', 'TEXT NULL');
  await ensureColumn('lessons', 'playlist_urls', 'JSON NULL');
  await ensureColumn('lessons', 'duration_seconds', 'INT NOT NULL DEFAULT 0');
  await ensureColumn('lessons', 'order_index', 'INT NOT NULL DEFAULT 0');

  // 4. Lesson Progress Table Columns
  console.log('\n[4/7] Checking `lesson_progress` table...');
  await ensureColumn('lesson_progress', 'is_completed', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('lesson_progress', 'completed_at', 'DATETIME NULL');
  await ensureColumn('lesson_progress', 'max_watched_time_sec', 'INT NOT NULL DEFAULT 0');
  await ensureColumn('lesson_progress', 'updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 5. Video Watch Time Table Columns
  console.log('\n[5/7] Checking `video_watch_time` table...');
  await ensureColumn('video_watch_time', 'watched_seconds', 'INT NOT NULL DEFAULT 0');
  await ensureColumn('video_watch_time', 'total_seconds', 'INT NOT NULL DEFAULT 0');
  await ensureColumn('video_watch_time', 'last_watched_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // 6. Certificates Table Columns
  console.log('\n[6/7] Checking `certificates` table...');
  await ensureColumn('certificates', 'recipient_name', 'VARCHAR(255) NULL');

  // 7. App Settings Table
  console.log('\n[7/7] Checking `app_settings` table...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ Table `app_settings` verified');

  // Default app settings
  const defaults = [
    ['platform_name', 'Jolly Clamps Technical Training LMS'],
    ['org_name', 'Jolly Clamps'],
    ['support_email', 'admin@jollyclamps.com'],
    ['issuer_name', 'Jolly Clamps Technical Training Academy'],
    ['signatory_title', 'Head of Operations & Safety Directorate'],
    ['enforce_anti_skip', 'true'],
    ['allow_youtube_embeds', 'true'],
    ['max_upload_limit_mb', '500']
  ];

  for (const [k, v] of defaults) {
    await conn.query('INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [k, v]);
  }
  console.log('  ✓ Default corporate settings populated in `app_settings`');

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('  🎉 Database schema migration completed successfully!');
  console.log('══════════════════════════════════════════════════════════════════\n');
  await conn.end();
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
