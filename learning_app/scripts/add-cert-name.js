const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '12345',
    database: process.env.MYSQL_DATABASE || 'learning_app_db',
  });

  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM certificates LIKE 'recipient_name'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE certificates ADD COLUMN recipient_name VARCHAR(255) NULL');
      console.log('Column recipient_name added successfully to certificates table.');
    } else {
      console.log('Column recipient_name already exists in certificates table.');
    }

    const [desc] = await pool.query('DESCRIBE certificates');
    console.log('Certificates table columns:', desc.map((c) => c.Field));
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await pool.end();
  }
}

run();
