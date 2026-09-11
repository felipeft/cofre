-- Remove definitivamente metadados de uma funcionalidade automática
-- descontinuada. Categorias e movimentações existentes são preservadas.
ALTER TABLE categories DROP COLUMN apply_offer;
ALTER TABLE categories DROP COLUMN offer_rate;
ALTER TABLE categories DROP COLUMN apply_tithe;
ALTER TABLE categories DROP COLUMN tithe_rate;

ALTER TABLE transactions DROP COLUMN offer_amount;
ALTER TABLE transactions DROP COLUMN tithe_amount;
ALTER TABLE transactions DROP COLUMN offer_rate_applied;
ALTER TABLE transactions DROP COLUMN tithe_rate_applied;

ALTER TABLE user_settings DROP COLUMN default_offer_rate;
ALTER TABLE user_settings DROP COLUMN default_tithe_rate;
