-- `card_id` é o relacionamento real, por ID, que faltava — a coluna `card`
-- (texto livre, criada numa etapa anterior) permanece intocada por
-- compatibilidade (não editamos uma migration antiga já aplicada, e código
-- existente pode depender dela), mas fica descontinuada: todo código novo
-- usa `card_id`. Nullable porque a maioria das transações não usa cartão.
ALTER TABLE transactions ADD COLUMN card_id INTEGER REFERENCES credit_cards (id) ON DELETE RESTRICT;
CREATE INDEX idx_transactions_card_id ON transactions (card_id);

-- Identifica quais linhas pertencem à mesma compra parcelada original (ver
-- domain/installmentPlan.js). `installment_current`/`installment_total` já
-- existiam desde uma etapa anterior, mas sem nada que agrupasse as parcelas
-- de uma mesma compra entre si.
ALTER TABLE transactions ADD COLUMN installment_group_id TEXT;
CREATE INDEX idx_transactions_installment_group_id ON transactions (installment_group_id);
