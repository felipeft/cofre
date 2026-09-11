CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE oauth_login_attempts (
  state_hash TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_oauth_login_attempts_expires_at ON oauth_login_attempts (expires_at);

ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE credit_cards ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE recurring_expenses ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE credit_card_payments ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;

DROP INDEX idx_categories_type_name;
CREATE UNIQUE INDEX idx_categories_user_type_name
  ON categories (user_id, type, name COLLATE NOCASE) WHERE user_id IS NOT NULL;
DROP INDEX idx_credit_cards_name;
CREATE UNIQUE INDEX idx_credit_cards_user_name
  ON credit_cards (user_id, name COLLATE NOCASE) WHERE user_id IS NOT NULL;

CREATE INDEX idx_categories_user_id ON categories (user_id);
CREATE INDEX idx_transactions_user_id ON transactions (user_id);
CREATE INDEX idx_credit_cards_user_id ON credit_cards (user_id);
CREATE INDEX idx_recurring_expenses_user_id ON recurring_expenses (user_id);
CREATE INDEX idx_credit_card_payments_user_id ON credit_card_payments (user_id);

-- Defesa adicional contra relações entre recursos de usuários diferentes.
CREATE TRIGGER transactions_owner_insert BEFORE INSERT ON transactions
WHEN NEW.user_id IS NOT NULL AND (
  (SELECT user_id FROM categories WHERE id = NEW.category_id) IS NOT NEW.user_id OR
  (NEW.card_id IS NOT NULL AND (SELECT user_id FROM credit_cards WHERE id = NEW.card_id) IS NOT NEW.user_id) OR
  (NEW.recurring_expense_id IS NOT NULL AND (SELECT user_id FROM recurring_expenses WHERE id = NEW.recurring_expense_id) IS NOT NEW.user_id)
)
BEGIN SELECT RAISE(ABORT, 'transaction ownership mismatch'); END;

CREATE TRIGGER transactions_owner_update BEFORE UPDATE OF user_id, category_id, card_id, recurring_expense_id ON transactions
WHEN NEW.user_id IS NOT NULL AND (
  (SELECT user_id FROM categories WHERE id = NEW.category_id) IS NOT NEW.user_id OR
  (NEW.card_id IS NOT NULL AND (SELECT user_id FROM credit_cards WHERE id = NEW.card_id) IS NOT NEW.user_id) OR
  (NEW.recurring_expense_id IS NOT NULL AND (SELECT user_id FROM recurring_expenses WHERE id = NEW.recurring_expense_id) IS NOT NEW.user_id)
)
BEGIN SELECT RAISE(ABORT, 'transaction ownership mismatch'); END;

CREATE TRIGGER recurring_expenses_owner_insert BEFORE INSERT ON recurring_expenses
WHEN NEW.user_id IS NOT NULL AND (
  (SELECT user_id FROM categories WHERE id = NEW.category_id) IS NOT NEW.user_id OR
  (NEW.card_id IS NOT NULL AND (SELECT user_id FROM credit_cards WHERE id = NEW.card_id) IS NOT NEW.user_id)
)
BEGIN SELECT RAISE(ABORT, 'recurring expense ownership mismatch'); END;

CREATE TRIGGER recurring_expenses_owner_update BEFORE UPDATE OF user_id, category_id, card_id ON recurring_expenses
WHEN NEW.user_id IS NOT NULL AND (
  (SELECT user_id FROM categories WHERE id = NEW.category_id) IS NOT NEW.user_id OR
  (NEW.card_id IS NOT NULL AND (SELECT user_id FROM credit_cards WHERE id = NEW.card_id) IS NOT NEW.user_id)
)
BEGIN SELECT RAISE(ABORT, 'recurring expense ownership mismatch'); END;

CREATE TRIGGER credit_card_payments_owner_insert BEFORE INSERT ON credit_card_payments
WHEN NEW.user_id IS NOT NULL AND (SELECT user_id FROM credit_cards WHERE id = NEW.card_id) IS NOT NEW.user_id
BEGIN SELECT RAISE(ABORT, 'card payment ownership mismatch'); END;
