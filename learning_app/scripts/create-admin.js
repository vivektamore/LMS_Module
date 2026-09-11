/**
 * User Creation Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage (run from the learning_app folder):
 *
 *   node scripts/create-admin.js --email admin@company.com --password Secret123
 *   node scripts/create-admin.js --email emp@company.com --password Secret123 --role employee --department Maintenance
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const path = require('path');
const fs   = require('fs');

// ── Load .env.local manually (no dotenv needed) ───────────────────────────────
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

// ── Valid Departments ────────────────────────────────────────────────────
const DEPARTMENTS = [
  'HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY',
  'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
  'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
];

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const email      = getArg('--email');
const password   = getArg('--password');
const department = getArg('--department') ? getArg('--department').toUpperCase() : null;
const role       = getArg('--role') || 'admin';

// Show department list and exit
if (args.includes('--list-departments')) {
  console.log('\n🏢  Available Departments:\n');
  DEPARTMENTS.forEach((d, i) => console.log(`   ${String(i + 1).padStart(2, ' ')}.  ${d}`));
  console.log('\n   Usage example:');
  console.log('   node scripts/create-admin.js --email x@y.com --password pass123 --department MAINTENANCE\n');
  process.exit(0);
}

if (!email || !password) {
  console.error('\n❌  Usage: node scripts/create-admin.js --email <email> --password <password> [--role admin|employee] [--department <name>]');
  console.error('   Tip  : Run with --list-departments to see all valid department names\n');
  process.exit(1);
}

if (!['admin', 'employee'].includes(role)) {
  console.error('\n❌  --role must be either "admin" or "employee"\n');
  process.exit(1);
}

if (department && !DEPARTMENTS.includes(department)) {
  console.error(`\n❌  Unknown department: "${department}"`);
  console.error('   Run with --list-departments to see all valid options\n');
  process.exit(1);
}

if (password.length < 6) {
  console.error('\n❌  Password must be at least 6 characters.\n');
  process.exit(1);
}

// ── Connect & Insert ──────────────────────────────────────────────────────────
async function main() {
  const pool = mysql.createPool({
    host     : process.env.MYSQL_HOST     || '127.0.0.1',
    port     : Number(process.env.MYSQL_PORT) || 3306,
    user     : process.env.MYSQL_USER     || 'root',
    password : process.env.MYSQL_PASSWORD || '',
    database : process.env.MYSQL_DATABASE || 'learning_app_db',
  });

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.error(`\n❌  A user with email "${email}" already exists.\n`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = randomUUID();

    await pool.execute(
      'INSERT INTO users (id, email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, email, hashedPassword, role, department, adminId]
    );

    console.log(`\n✅  User account created successfully!`);
    console.log(`    Email      : ${email}`);
    console.log(`    Role       : ${role}`);
    console.log(`    Department : ${department || 'Not assigned'}`);
    console.log(`    ID         : ${adminId}`);
    console.log('\n   The user can now log in at /login\n');

  } catch (err) {
    console.error('\n❌  Error:', err.message, '\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
