const mysql = require('mysql2/promise');

// Read directly from env (simulating what Next.js does)
async function test() {
  const password = '12345';
  console.log(`Testing connection with password: "${password}"`);
  
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: password,
    });
    console.log('✅ Connected successfully!');
    const [rows] = await conn.query('SELECT VERSION() as version');
    console.log('MySQL version:', rows[0].version);
    await conn.end();
  } catch (err) {
    console.log('❌ Failed:', err.message);
    console.log('\nTrying with ALTER USER fix...');
    console.log('Run this in MySQL to fix:');
    console.log(`ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '12345';`);
    console.log('FLUSH PRIVILEGES;');
  }
}

test();
