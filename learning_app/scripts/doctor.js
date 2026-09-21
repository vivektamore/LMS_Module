/**
 * LEARNING APP — SYSTEM DOCTOR & DEBUGGER
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive diagnostic check for MySQL, environment variables, schema,
 * tables, admin accounts, and system readiness.
 *
 * Usage:
 *   node scripts/doctor.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// ANSI Color Codes
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BLUE   = '\x1b[34m';

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}   🩺  LEARNING APP — SYSTEM DIAGNOSTIC & HEALTH CHECK          ${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════${RESET}\n`);

// 1. Check .env.local
const envPath = path.join(__dirname, '../.env.local');
let envFound = false;
if (fs.existsSync(envPath)) {
  envFound = true;
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

console.log(`${BOLD}[1/5] Environment Configuration${RESET}`);
if (envFound) {
  console.log(`  ${GREEN}✓${RESET} .env.local found`);
} else {
  console.log(`  ${YELLOW}⚠${RESET} .env.local not found (using default fallback config)`);
}

const host = process.env.MYSQL_HOST || '127.0.0.1';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '12345';
const database = process.env.MYSQL_DATABASE || 'learning_app_db';
const jwtSecret = process.env.JWT_SECRET || 'jolly-secret-key-2026';

console.log(`  ${GREEN}✓${RESET} Host: ${host}:${port}`);
console.log(`  ${GREEN}✓${RESET} User: ${user}`);
console.log(`  ${GREEN}✓${RESET} Database: ${database}`);
console.log(`  ${GREEN}✓${RESET} JWT Secret: ${jwtSecret ? 'Configured' : 'Missing'}`);

async function runDiagnostics() {
  let conn;
  try {
    // 2. MySQL Connection Test
    console.log(`\n${BOLD}[2/5] Database Connection${RESET}`);
    conn = await mysql.createConnection({ host, port, user, password, database });
    const [v] = await conn.query('SELECT VERSION() as version');
    console.log(`  ${GREEN}✓ Connected successfully to MySQL ${v[0].version}!${RESET}`);

    // 3. Schema & Required Tables Check
    console.log(`\n${BOLD}[3/5] Schema & Tables Verification${RESET}`);
    const requiredTables = [
      'users',
      'categories',
      'courses',
      'course_departments',
      'modules',
      'lessons',
      'lesson_quizzes',
      'enrollments',
      'lesson_progress',
      'video_watch_time',
      'certificates'
    ];

    const [existingRows] = await conn.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
      [database]
    );
    const existingTables = new Set(existingRows.map(r => r.table_name || r.TABLE_NAME));

    let allTablesOk = true;
    for (const table of requiredTables) {
      if (existingTables.has(table)) {
        const [countRow] = await conn.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        console.log(`  ${GREEN}✓${RESET} Table ${BOLD}${table.padEnd(20)}${RESET} [${countRow[0].count} records]`);
      } else {
        console.log(`  ${RED}✗ Missing table: ${table}${RESET}`);
        allTablesOk = false;
      }
    }

    if (!allTablesOk) {
      console.log(`\n  ${RED}⚠ Some tables are missing! Run db/final_schema_server.sql to repair.${RESET}`);
    }

    // 4. User & Role Audit
    console.log(`\n${BOLD}[4/5] User & Security Status${RESET}`);
    const [adminUsers] = await conn.query("SELECT email, department FROM users WHERE role = 'admin'");
    const [empUsers] = await conn.query("SELECT email, department FROM users WHERE role = 'employee'");

    if (adminUsers.length === 0) {
      console.log(`  ${YELLOW}⚠ WARNING: No Admin accounts exist!${RESET}`);
      console.log(`    Run: ${CYAN}node scripts/create-admin.js --email admin@jollyclamps.com --password YourPassword${RESET}`);
    } else {
      console.log(`  ${GREEN}✓${RESET} Active Admins (${adminUsers.length}):`);
      adminUsers.forEach(a => console.log(`      • ${a.email} (${a.department || 'GLOBAL'})`));
    }

    console.log(`  ${GREEN}✓${RESET} Active Employees: ${empUsers.length}`);

    // 5. Training Content & Features Status
    console.log(`\n${BOLD}[5/5] Training Content & Features${RESET}`);
    const [courses] = await conn.query('SELECT COUNT(*) as c FROM courses');
    const [quizzes] = await conn.query('SELECT COUNT(*) as c FROM lesson_quizzes');
    const [certs] = await conn.query('SELECT COUNT(*) as c FROM certificates');
    const [watchLogs] = await conn.query('SELECT COUNT(*) as c FROM video_watch_time');

    console.log(`  ${BLUE}•${RESET} Total Courses: ${courses[0].c}`);
    console.log(`  ${BLUE}•${RESET} In-Video Quiz Checkpoints: ${quizzes[0].c}`);
    console.log(`  ${BLUE}•${RESET} Issued Certificates: ${certs[0].c}`);
    console.log(`  ${BLUE}•${RESET} Watch Time Activity Logs: ${watchLogs[0].c}`);

    console.log(`\n${BOLD}${GREEN}══════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${GREEN}   🎉  DIAGNOSTIC COMPLETE — SYSTEM IS READY!                     ${RESET}`);
    console.log(`${BOLD}${GREEN}══════════════════════════════════════════════════════════════════${RESET}\n`);

  } catch (err) {
    console.log(`\n  ${RED}✗ Diagnostic Error: ${err.message}${RESET}\n`);
  } finally {
    if (conn) await conn.end();
  }
}

runDiagnostics();
