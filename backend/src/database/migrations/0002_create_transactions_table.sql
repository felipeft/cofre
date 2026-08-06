CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  date TEXT NOT NULL,

  -- Competência (mês/ano) separada da data do lançamento: no dia a dia elas
  -- coincidem, mas uma fatura de cartão fechada em outro mês, por exemplo,
  -- precisa que isso seja ajustável sem mudar a data do lançamento em si.
  competence_month INTEGER NOT NULL CHECK (competence_month BETWEEN 1 AND 12),
  competence_year INTEGER NOT NULL,

  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',

  -- Domínio preparado para recorrência/parcelamento/cartão/tags/status, sem
  -- nenhuma regra de negócio automática ainda associada a esses campos.
  is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
  is_fixed INTEGER NOT NULL DEFAULT 0 CHECK (is_fixed IN (0, 1)),
  card TEXT,
  installment_current INTEGER,
  installment_total INTEGER,
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array, serializado/desserializado na camada de service
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suportam os filtros e ordenações exigidos pela listagem (data, tipo,
-- categoria, competência) sem cair em table scan conforme o histórico cresce.
CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_competence ON transactions (competence_year, competence_month);
