CREATE TABLE google_sheets_integrations (
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  google_sub TEXT NOT NULL,
  google_account_email TEXT NOT NULL COLLATE NOCASE,
  refresh_token_encrypted TEXT,
  granted_scopes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (
    status IN ('authorized', 'ready', 'reauthorization_required', 'file_missing')
  ),
  spreadsheet_id TEXT,
  spreadsheet_name TEXT,
  start_year INTEGER CHECK (start_year IS NULL OR start_year BETWEEN 1900 AND 9999),
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_export_at TEXT,
  last_import_at TEXT,
  last_error_code TEXT,
  last_error_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (status != 'ready' OR spreadsheet_id IS NOT NULL)
);

CREATE TABLE google_sheets_oauth_attempts (
  state_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_google_sheets_oauth_attempts_user_id
  ON google_sheets_oauth_attempts (user_id);
CREATE INDEX idx_google_sheets_oauth_attempts_expires_at
  ON google_sheets_oauth_attempts (expires_at);

CREATE TABLE google_sheets_imports (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  imported_count INTEGER NOT NULL CHECK (imported_count >= 0),
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, fingerprint)
);
