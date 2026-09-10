CREATE TABLE recurring_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type = 'expense'),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  card_id INTEGER REFERENCES credit_cards (id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'recurring',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_recurring_expenses_active ON recurring_expenses (is_active);
CREATE INDEX idx_recurring_expenses_category_id ON recurring_expenses (category_id);
CREATE INDEX idx_recurring_expenses_card_id ON recurring_expenses (card_id);

ALTER TABLE transactions ADD COLUMN recurring_expense_id INTEGER REFERENCES recurring_expenses (id) ON DELETE RESTRICT;
CREATE INDEX idx_transactions_recurring_expense_id ON transactions (recurring_expense_id);

-- Uma linha cancelada continua ocupando sua competência: ela representa uma
-- ocorrência deliberadamente cancelada e não deve ser recriada pela rotina.
CREATE UNIQUE INDEX idx_transactions_recurring_expense_competence
  ON transactions (recurring_expense_id, competence_year, competence_month)
  WHERE recurring_expense_id IS NOT NULL;
