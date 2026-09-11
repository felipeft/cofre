CREATE TABLE google_sheets_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'automatic')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'conflicts', 'failed')),
  records_read INTEGER NOT NULL DEFAULT 0 CHECK (records_read >= 0),
  records_imported INTEGER NOT NULL DEFAULT 0 CHECK (records_imported >= 0),
  records_existing INTEGER NOT NULL DEFAULT 0 CHECK (records_existing >= 0),
  records_exported INTEGER NOT NULL DEFAULT 0 CHECK (records_exported >= 0),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  invalid_count INTEGER NOT NULL DEFAULT 0 CHECK (invalid_count >= 0),
  details_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX idx_google_sheets_sync_runs_one_running_per_user
  ON google_sheets_sync_runs (user_id)
  WHERE status = 'running';

CREATE INDEX idx_google_sheets_sync_runs_user_started
  ON google_sheets_sync_runs (user_id, started_at DESC, id DESC);
