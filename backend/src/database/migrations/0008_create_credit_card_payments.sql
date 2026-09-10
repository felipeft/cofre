CREATE TABLE credit_card_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES credit_cards (id) ON DELETE RESTRICT,
  amount REAL NOT NULL CHECK (amount > 0),
  paid_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_credit_card_payments_card_id ON credit_card_payments (card_id);
CREATE INDEX idx_credit_card_payments_paid_at ON credit_card_payments (paid_at);
