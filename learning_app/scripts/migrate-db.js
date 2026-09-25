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
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`  ✓ Added \`${column}\` to \`${table}\``);
    } else {
      console.log(`  ✓ Column \`${table}.${column}\` already exists`);
    }
  }

  // 1. Users Table Columns
  await ensureColumn('users', 'name', 'VARCHAR(255) NULL AFTER `email`');
  await ensureColumn('users', 'employee_id', 'VARCHAR(50) NULL AFTER `name`');
  await ensureColumn('users', 'created_by', 'VARCHAR(36) NULL AFTER `department`');

  // Backfill names from email if null
  await conn.query(`
    UPDATE users 
    SET name = CONCAT(
      UPPER(SUBSTRING(SUBSTRING_INDEX(email, '@', 1), 1, 1)),
      LOWER(SUBSTRING(SUBSTRING_INDEX(email, '@', 1), 2))
    )
    WHERE name IS NULL OR name = ''
  `);

  // 2. Courses Table Columns
  await ensureColumn('courses', 'course_code', 'VARCHAR(50) NULL AFTER `title`');

  // 3. Certificates Table Columns
  await ensureColumn('certificates', 'recipient_name', 'VARCHAR(255) NULL AFTER `issued_at`');

  // 4. Ensure app_settings table exists
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

  console.log('\n🎉 Database schema migration completed successfully!\n');
  await conn.end();
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
