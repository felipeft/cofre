CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mesmo nome de categoria não pode existir duas vezes para o mesmo tipo
-- (uma despesa "Mercado" e uma receita "Mercado" são coisas diferentes,
-- mas duas despesas "Mercado" não fazem sentido). COLLATE NOCASE torna a
-- unicidade insensível a maiúsculas/minúsculas.
CREATE UNIQUE INDEX idx_categories_type_name ON categories (type, name COLLATE NOCASE);

-- Toda listagem por padrão filtra por is_active = 1 (ver category.repository.js).
CREATE INDEX idx_categories_is_active ON categories (is_active);
