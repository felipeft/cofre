ALTER TABLE users ADD COLUMN display_name TEXT CHECK (
  display_name IS NULL OR (length(trim(display_name)) BETWEEN 1 AND 80)
);

CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  default_offer_rate REAL NOT NULL DEFAULT 0.01 CHECK (default_offer_rate BETWEEN 0 AND 1),
  default_tithe_rate REAL NOT NULL DEFAULT 0.10 CHECK (default_tithe_rate BETWEEN 0 AND 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Preserva todos os usuários já criados na Etapa 10 com os mesmos defaults
-- financeiros que o sistema utilizava antes desta migration.
INSERT INTO user_settings (user_id)
SELECT id FROM users;

-- A linha 1:1 nasce junto com todo novo usuário. O repository também usa
-- INSERT OR IGNORE como defesa para bancos restaurados ou dados incompletos.
CREATE TRIGGER users_create_settings AFTER INSERT ON users
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
END;
