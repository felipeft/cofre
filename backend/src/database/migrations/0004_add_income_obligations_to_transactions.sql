-- Snapshot da oferta/dízimo calculados no momento em que a transação de
-- receita foi criada (ou editada por último). Guardar aqui — em vez de
-- recalcular sempre a partir da configuração ATUAL da categoria — é o que
-- garante que mudar a taxa de uma fonte amanhã não altere silenciosamente o
-- valor de obrigações já registradas no passado (ver domain/financialRules.js
-- e o README para a justificativa completa dessa escolha).
--
-- `offer_rate_applied`/`tithe_rate_applied` guardam a taxa efetivamente
-- usada no cálculo (própria da categoria ou o padrão global no momento) —
-- não é usada em nenhum cálculo, existe só para auditoria/histórico
-- ("por que essa oferta foi R$20 e não R$25?").
ALTER TABLE transactions ADD COLUMN offer_amount REAL NOT NULL DEFAULT 0 CHECK (offer_amount >= 0);
ALTER TABLE transactions ADD COLUMN tithe_amount REAL NOT NULL DEFAULT 0 CHECK (tithe_amount >= 0);
ALTER TABLE transactions ADD COLUMN offer_rate_applied REAL;
ALTER TABLE transactions ADD COLUMN tithe_rate_applied REAL;
