/**
 * Terminal CLI Script: Update Super Admin Email ID & Account Details
 * 
 * Usage:
 *   Interactive mode:
 *     npm run update-admin-email
 *     or: node scripts/update-admin-email.js
 * 
 *   CLI flag mode:
 *     node scripts/update-admin-email.js --new <new_email>
 *     node scripts/update-admin-email.js --current <old_email> --new <new_email> --password <new_pin>
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
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

function parseArgs() {
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

function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('   Jolly Clamps LMS — Super Admin Email Update Tool');
  console.log('======================================================\n');

  const args = parseArgs();

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '12345',
    database: process.env.MYSQL_DATABASE || 'learning_app_db',
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. Determine current admin email
    let currentEmail = args.current || args.from;
    if (!currentEmail) {
      // Find default super admin or primary admin in database
      const [admins] = await conn.query(
        "SELECT id, email, name, employee_id, role, department FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
      );
      const defaultAdmin = admins[0] || { email: 'maintenance.pew@gmail.com' };

      currentEmail = await prompt(
        rl,
        `Enter Current Super Admin Email [Default: ${defaultAdmin.email}]: `
      );
      if (!currentEmail) {
        currentEmail = defaultAdmin.email;
      }
    }

    // Verify current admin exists
    const [existing] = await conn.query('SELECT * FROM users WHERE email = ?', [currentEmail]);
    if (existing.length === 0) {
      console.error(`\n❌ Error: No user found with email "${currentEmail}".`);
      process.exit(1);
    }
    const adminUser = existing[0];

    console.log(`\nFound Admin Account: ${adminUser.name || 'Admin'} (${adminUser.email})`);
    console.log(`Employee ID: ${adminUser.employee_id || 'N/A'} | Role: ${adminUser.role}\n`);

    // 2. Determine new email
    let newEmail = args.new || args.to;
    if (!newEmail) {
      newEmail = await prompt(rl, 'Enter New Super Admin Email Address: ');
    }

    if (!newEmail || !newEmail.includes('@')) {
      console.error('\n❌ Error: A valid new email address is required.');
      process.exit(1);
    }
    newEmail = newEmail.toLowerCase().trim();

    if (newEmail === currentEmail.toLowerCase()) {
      console.log('\nℹ️ New email is the same as current email. No email change needed.');
    } else {
      // Check if new email is already taken
      const [conflict] = await conn.query('SELECT id FROM users WHERE email = ? AND id != ?', [
        newEmail,
        adminUser.id,
      ]);
      if (conflict.length > 0) {
        console.error(`\n❌ Error: Email "${newEmail}" is already registered by another account.`);
        process.exit(1);
      }
    }

    // 3. Optional name & password updates
    let newName = args.name;
    if (newName === undefined && !args.new) {
      newName = await prompt(
        rl,
        `Update Name? [Current: ${adminUser.name || 'Not set'}, press Enter to keep]: `
      );
    }
    const finalName = newName && newName.trim() ? newName.trim() : adminUser.name;

    let newPassword = args.password;
    if (newPassword === undefined && !args.new) {
      newPassword = await prompt(
        rl,
        'Update Password / PIN? (Press Enter to keep current password): '
      );
    }

    // 4. Perform update in database
    if (newPassword && newPassword.trim()) {
      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      await conn.query(
        `UPDATE users 
         SET email = ?, name = ?, password_hash = ?, role = 'admin' 
         WHERE id = ?`,
        [newEmail, finalName, passwordHash, adminUser.id]
      );
    } else {
      await conn.query(
        `UPDATE users 
         SET email = ?, name = ?, role = 'admin' 
         WHERE id = ?`,
        [newEmail, finalName, adminUser.id]
      );
    }

    // Update app_settings support_email if it matched old email
    try {
      await conn.query(
        "UPDATE app_settings SET setting_value = ? WHERE setting_key = 'support_email' AND setting_value = ?",
        [newEmail, currentEmail]
      );
    } catch (_) { }

    console.log('\n======================================================');
    console.log('✅ SUPER ADMIN EMAIL UPDATED SUCCESSFULLY');
    console.log('======================================================');
    console.log(`   • Old Email:    ${currentEmail}`);
    console.log(`   • New Email:    ${newEmail}`);
    console.log(`   • Name:         ${finalName || adminUser.name}`);
    console.log(`   • Employee ID:  ${adminUser.employee_id || 'JC-MNT-001'}`);
    console.log(`   • Role:         admin (Privileged)`);
    if (newPassword && newPassword.trim()) {
      console.log(`   • New Password: ${newPassword.trim()}`);
    } else {
      console.log('   • Password:     (Unchanged)');
    }
    console.log('------------------------------------------------------');
    console.log('You can now log in at: http://localhost:3000/login');
    console.log(`Login Email:    ${newEmail}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Database Error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    await conn.end();
  }
}

main();
