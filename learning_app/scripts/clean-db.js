/**
 * Database Cleanup Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Cleans out dummy and test data from learning_app_db.
 *
 * Usage:
 *   node scripts/clean-db.js --activity-only   (Clears watch time, progress, enrollments, certificates)
 *   node scripts/clean-db.js --test-users      (Deletes dummy test users like testuser@example.com)
 *   node scripts/clean-db.js --courses         (Deletes all courses, lessons, quizzes)
 *   node scripts/clean-db.js --all             (Cleans activity, courses, and dummy test users)
 *   node scripts/clean-db.js --all-users       (Deletes ALL user and admin accounts)
 *   node scripts/clean-db.js --reset-everything(Complete 100% database factory reset)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load .env.local
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

const args = process.argv.slice(2);
const cleanActivity = args.includes('--activity-only') || args.includes('--all') || args.length === 0;
const cleanCourses = args.includes('--courses') || args.includes('--all');
const cleanUsers = args.includes('--test-users') || args.includes('--all');
const cleanAllUsers = args.includes('--all-users') || args.includes('--reset-everything');
const cleanCategories = args.includes('--categories') || args.includes('--reset-everything');

async function main() {
  console.log('\n🧹  LEARNING APP — DATABASE CLEANUP');
  console.log('───────────────────────────────────────────────────────');
  
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '12345',
    database: process.env.MYSQL_DATABASE || 'learning_app_db',
  });

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    if (cleanActivity) {
      console.log('🗑️  Clearing user activity data (watch time, progress, enrollments, certificates)...');
      await conn.query('TRUNCATE TABLE video_watch_time');
      await conn.query('TRUNCATE TABLE lesson_progress');
      await conn.query('TRUNCATE TABLE certificates');
      await conn.query('TRUNCATE TABLE enrollments');
      console.log('   ✅ Activity logs wiped clean.');
    }

    if (cleanCourses) {
      console.log('🗑️  Clearing courses, modules, lessons, and quizzes...');
      await conn.query('TRUNCATE TABLE lesson_quizzes');
      await conn.query('TRUNCATE TABLE lessons');
      await conn.query('TRUNCATE TABLE modules');
      await conn.query('TRUNCATE TABLE course_departments');
      await conn.query('TRUNCATE TABLE courses');
      console.log('   ✅ All courses and lessons wiped clean.');
    }

    if (cleanAllUsers) {
      console.log('🗑️  Deleting ALL users and admins (complete user wipeout)...');
      await conn.query('TRUNCATE TABLE users');
      console.log('   ✅ All user and admin accounts deleted.');
    } else if (cleanUsers) {
      console.log('🗑️  Removing dummy test users (e.g. @example.com, testuser*)...');
      const [res] = await conn.query("DELETE FROM users WHERE email LIKE '%example.com%' OR email LIKE '%test%'");
      console.log(`   ✅ Removed ${res.affectedRows} dummy test users.`);
    }

    if (cleanCategories) {
      console.log('🗑️  Clearing categories...');
      await conn.query('TRUNCATE TABLE categories');
      console.log('   ✅ All categories wiped clean.');
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n📊  CURRENT DATABASE STATUS:');
    console.log('───────────────────────────────────────────────────────');
    const [users] = await conn.query('SELECT email, role, department FROM users');
    console.log(`👥  Users Remaining (${users.length}):`);
    users.forEach(u => console.log(`    - ${u.email} [${u.role.toUpperCase()}] Department: ${u.department || 'GLOBAL'}`));

    const [cats] = await conn.query('SELECT COUNT(*) AS count FROM categories');
    console.log(`🏷️   Categories Remaining: ${cats[0].count}`);

    const [courses] = await conn.query('SELECT COUNT(*) AS count FROM courses');
    console.log(`📚  Courses Remaining: ${courses[0].count}`);

    const [watch] = await conn.query('SELECT COUNT(*) AS count FROM video_watch_time');
    console.log(`⏱️   Watch Time Records: ${watch[0].count}`);

    const [certs] = await conn.query('SELECT COUNT(*) AS count FROM certificates');
    console.log(`🎓  Certificates: ${certs[0].count}`);

    console.log('\n✨ Database is fresh and ready!\n');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await conn.end();
  }
}

main();
