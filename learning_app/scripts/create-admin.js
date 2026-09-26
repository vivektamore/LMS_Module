/**
 * Terminal CLI Script: Create or Promote Super Admin (HR / Maintenance)
 * 
 * Super Admins in Jolly Clamps LMS are strictly:
 *   - HR (Human Resources)
 *   - MAINTENANCE (Plant Maintenance)
 * 
 * Usage Examples:
 *   1. Interactive mode:
 *      npm run create-admin
 * 
 *   2. Command-line flags mode:
 *      node scripts/create-admin.js --email hr@jollyclamps.com --name "HR Director" --department HR --password "12345"
 *      node scripts/create-admin.js --email maintenance.pew@gmail.com --name "Vivek Tamore" --department MAINTENANCE --password "12345"
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      if (k && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  });
}

const DEPT_CODE_MAP = {
  HR: 'HR',
  IT: 'IT',
  DEV: 'DEV',
  DEVELOPMENT: 'DEV',
  AI: 'AI',
  SAFETY: 'SAF',
  MAINTENANCE: 'MNT',
  PRODUCTION: 'PRD',
  QUALITY: 'QLT',
  DESIGN: 'DSG',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE',
  STORE: 'STR',
  DISPATCH: 'DSP',
  GLOBAL: 'ADM',
};

async function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

function prompt(rl, question, isPassword = false) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function getNextEmployeeId(conn, department) {
  const deptKey = (department || 'GLOBAL').toUpperCase().replace(/[\s-]/g, '_');
  const code = DEPT_CODE_MAP[deptKey] || deptKey.slice(0, 3).toUpperCase();
  const prefix = `JC-${code}-`;

  const [rows] = await conn.query(
    'SELECT employee_id FROM users WHERE employee_id LIKE ?',
    [`${prefix}%`]
  );

  let maxNum = 0;
  for (const row of rows) {
    if (row.employee_id) {
      const match = row.employee_id.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

async function main() {
  console.log('\n======================================================');
  console.log('   Jolly Clamps LMS — Terminal Super Admin Provisioning');
  console.log('======================================================\n');

  const args = await parseArgs();

  let email = args.email;
  let name = args.name;
  let department = args.department;
  let password = args.password;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (!email) {
      email = await prompt(rl, 'Enter Admin Email (e.g. hr@jollyclamps.com / dev@jollyclamps.com): ');
    }
    if (!email || !email.includes('@')) {
      console.error('Error: A valid email address is required.');
      process.exit(1);
    }

    if (!name) {
      name = await prompt(rl, 'Enter Full Name (e.g. HR Director / Vivek Tamore): ');
    }

    if (!department) {
      department = await prompt(rl, 'Enter Department (HR, MAINTENANCE) [Default: MAINTENANCE]: ');
      if (!department) department = 'MAINTENANCE';
    }
    department = department.toUpperCase();

    if (!password) {
      password = await prompt(rl, 'Enter Password / PIN [Default: 12345]: ');
      if (!password) password = '12345';
    }

    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '12345',
      database: process.env.MYSQL_DATABASE || 'learning_app_db',
    });

    console.log('\nConnecting to database...');

    // Check if user already exists
    const [existing] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    const passwordHash = await bcrypt.hash(password, 10);

    let employeeId;

    if (existing.length > 0) {
      const user = existing[0];
      employeeId = user.employee_id || (await getNextEmployeeId(conn, department));
      const finalName = name || user.name || email.split('@')[0];

      await conn.query(
        `UPDATE users 
         SET role = 'admin',
             name = ?,
             department = ?,
             employee_id = ?,
             password_hash = ?
         WHERE id = ?`,
        [finalName, department, employeeId, passwordHash, user.id]
      );

      console.log('\n✅ Existing user upgraded to SUPER ADMIN:');
      console.log(`   • ID:          ${user.id}`);
      console.log(`   • Name:        ${finalName}`);
      console.log(`   • Email:       ${email}`);
      console.log(`   • Employee ID: ${employeeId}`);
      console.log(`   • Role:        admin (Privileged)`);
      console.log(`   • Department:  ${department}`);
    } else {
      const newId = randomUUID();
      employeeId = await getNextEmployeeId(conn, department);
      const finalName = name || email.split('@')[0];

      await conn.query(
        `INSERT INTO users (id, email, name, employee_id, password_hash, role, department)
         VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
        [newId, email, finalName, employeeId, passwordHash, department]
      );

      console.log('\n✅ New SUPER ADMIN account registered successfully:');
      console.log(`   • ID:          ${newId}`);
      console.log(`   • Name:        ${finalName}`);
      console.log(`   • Email:       ${email}`);
      console.log(`   • Employee ID: ${employeeId}`);
      console.log(`   • Role:        admin (Privileged)`);
      console.log(`   • Department:  ${department}`);
    }

    console.log('\n------------------------------------------------------');
    console.log('You can now log in at: http://localhost:3000/login');
    console.log(`Login Email:    ${email}`);
    console.log(`Password / PIN: ${password}`);
    console.log('------------------------------------------------------\n');

    await conn.end();
  } catch (err) {
    console.error('\n❌ Error provisioning admin account:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
