USE learning_app_db;

-- Add created_by to users (tracks which admin created each user)
ALTER TABLE users
  ADD COLUMN created_by VARCHAR(36) NULL AFTER department;

-- For existing users: set created_by = their own ID (they self-registered or were the first admin)
UPDATE users SET created_by = id WHERE created_by IS NULL;

SELECT 'Migration v3 complete!' AS status;
