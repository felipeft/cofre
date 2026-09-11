ALTER TABLE recurring_expenses ADD COLUMN generated_through TEXT CHECK (
  generated_through IS NULL OR generated_through GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-01'
);

-- Bancos existentes já possuem as ocorrências materializadas. O checkpoint
-- começa na competência mais recente encontrada para não reprocessar todo o
-- histórico na primeira requisição após o deploy.
UPDATE recurring_expenses
SET generated_through = (
  SELECT printf('%04d-%02d-01', t.competence_year, t.competence_month)
  FROM transactions t
  WHERE t.recurring_expense_id = recurring_expenses.id
  ORDER BY t.competence_year DESC, t.competence_month DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM transactions t WHERE t.recurring_expense_id = recurring_expenses.id
);

ALTER TABLE google_sheets_integrations
ADD COLUMN requires_full_export INTEGER NOT NULL DEFAULT 0
CHECK (requires_full_export IN (0, 1));

CREATE INDEX idx_recurring_expenses_user_active
  ON recurring_expenses (user_id, is_active, generated_through);
CREATE INDEX idx_transactions_user_competence
  ON transactions (user_id, competence_year, competence_month, status);
CREATE INDEX idx_transactions_user_date
  ON transactions (user_id, date DESC, id DESC);
CREATE INDEX idx_transactions_user_card_status
  ON transactions (user_id, card_id, status);
CREATE INDEX idx_transactions_user_recurring
  ON transactions (user_id, recurring_expense_id);
CREATE INDEX idx_card_payments_user_card
  ON credit_card_payments (user_id, card_id, paid_at DESC);
