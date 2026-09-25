const mysql = require('mysql2/promise');

async function initSettings() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '12345',
    database: 'learning_app_db'
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

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

  const [rows] = await conn.query('SELECT * FROM app_settings');
  console.log('App settings table initialized with', rows.length, 'records.');
  await conn.end();
}

initSettings().catch(console.error);
