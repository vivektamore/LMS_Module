const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'learning_app_db'
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id         VARCHAR(36)  NOT NULL PRIMARY KEY,
      user_id    VARCHAR(36)  NOT NULL,
      course_id  VARCHAR(36)  NULL,
      title      VARCHAR(255) NOT NULL,
      message    TEXT         NOT NULL,
      type       ENUM('reminder', 'course_assigned', 'info', 'system') NOT NULL DEFAULT 'reminder',
      is_read    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notif_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      CONSTRAINT fk_notif_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await conn.execute(sql);
  console.log('notifications table created successfully');

  // Also create index if not exists
  try {
    await conn.execute('CREATE INDEX idx_notifications_user_id ON notifications(user_id)');
  } catch (e) {
    // ignore duplicate index
  }

  try {
    await conn.execute('CREATE INDEX idx_notifications_course_id ON notifications(course_id)');
  } catch (e) {
    // ignore duplicate index
  }

  console.log('indexes created or verified successfully');
  await conn.end();
}

migrate().catch(console.error);
