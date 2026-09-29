/**
 * Jolly Clamps Technical LMS — LAN Server Health & Diagnostic Tool
 * 
 * Verifies:
 *   1. Server PC Network Interfaces (Local IPv4 for office access)
 *   2. Server-side Storage Directory (`uploads/`) & permissions
 *   3. Database connectivity (MySQL)
 *   4. Windows Firewall & PM2 recommendations
 * 
 * Run via:
 *   node scripts/lan-doctor.js
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envDefaultsPath = path.join(__dirname, '..', '.env');
const envFile = fs.existsSync(envPath) ? envPath : fs.existsSync(envDefaultsPath) ? envDefaultsPath : null;

if (envFile) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

function getLanIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Filter for IPv4 non-internal (not 127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  return addresses;
}

async function checkStorage() {
  const root = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
  const resolved = path.resolve(root);
  const categories = ['videos', 'thumbnails', 'pdfs', 'documents'];
  const results = { root: resolved, ok: true, categories: {} };

  try {
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }
    for (const cat of categories) {
      const p = path.join(resolved, cat);
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      const count = fs.readdirSync(p).filter((f) => f !== '.gitkeep').length;
      results.categories[cat] = { count, path: p };
    }
  } catch (err) {
    results.ok = false;
    results.error = err.message;
  }
  return results;
}

async function checkDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'learning_app_db',
      connectTimeout: 4000,
    });
    const [courses] = await conn.query('SELECT COUNT(*) AS count FROM courses');
    const [users] = await conn.query('SELECT COUNT(*) AS count FROM users');
    await conn.end();
    return { ok: true, coursesCount: courses[0]?.count || 0, usersCount: users[0]?.count || 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log('  Jolly Clamps LMS — LAN Single-Server Health Diagnostic');
  console.log('===============================================================\n');

  // 1. LAN IP Addresses
  const ips = getLanIpAddresses();
  const port = process.env.PORT || 3000;

  console.log('📡 1. Server PC Network Interfaces (Office LAN Access):');
  if (ips.length === 0) {
    console.log('   ⚠️  No active LAN adapter detected. Ensure this PC is connected to Wi-Fi/Ethernet.');
  } else {
    ips.forEach((ip) => {
      console.log(`   • [${ip.interface}]: http://${ip.address}:${port}`);
    });
    console.log(`\n   👉 Tell employees to open: http://${ips[0].address}:${port} in their browser.`);
  }

  // 2. Storage Check
  console.log('\n💾 2. Server PC Central Storage Directory:');
  const storage = await checkStorage();
  if (storage.ok) {
    console.log(`   ✓ Location: ${storage.root}`);
    for (const [cat, data] of Object.entries(storage.categories)) {
      console.log(`     - uploads/${cat}: ${data.count} file(s) stored on Server PC`);
    }
  } else {
    console.log(`   ❌ Storage Error: ${storage.error}`);
  }

  // 3. Database Check
  console.log('\n🗄️  3. MySQL Database Status:');
  const db = await checkDatabase();
  if (db.ok) {
    console.log(`   ✓ Connected successfully (${process.env.MYSQL_DATABASE || 'learning_app_db'})`);
    console.log(`     - Registered Users: ${db.usersCount}`);
    console.log(`     - Published Courses: ${db.coursesCount}`);
  } else {
    console.log(`   ❌ Database Connection Failed: ${db.error}`);
  }

  // 4. Windows Firewall & PM2
  console.log('\n🛡️  4. Windows Firewall & Production Setup:');
  console.log('   To ensure other office PCs can connect, verify inbound TCP port 3000 is open:');
  console.log('   PowerShell (Admin):');
  console.log('     New-NetFirewallRule -DisplayName "Jolly Clamps LMS" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private,Domain');

  console.log('\n🚀 5. Recommended Production Command (PM2):');
  console.log('   Build:   npm run build');
  console.log('   Start:   pm2 start ecosystem.config.js');
  console.log('   Save:    pm2 save');
  console.log('\n===============================================================\n');
}

main().catch(console.error);
