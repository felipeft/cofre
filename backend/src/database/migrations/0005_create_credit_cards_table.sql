-- Cartão como entidade própria (não mais a coluna `card` livre em texto,
-- criada numa etapa anterior sem lógica nenhuma por trás). Mesmo padrão de
-- `categories`: sem exclusão física quando há transações associadas (ver
-- card.service.js).
CREATE TABLE credit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  credit_limit REAL NOT NULL CHECK (credit_limit > 0),
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_credit_cards_name ON credit_cards (name COLLATE NOCASE);
CREATE INDEX idx_credit_cards_is_active ON credit_cards (is_active);
