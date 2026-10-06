ALTER TABLE daily_tasks ADD COLUMN delete_requested_at TEXT;
ALTER TABLE daily_tasks ADD COLUMN delete_reason TEXT NOT NULL DEFAULT '';
