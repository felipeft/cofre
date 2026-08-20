-- Uma categoria de receita (a "fonte de renda") passa a poder declarar se
-- gera oferta e/ou dízimo, e opcionalmente sobrescrever a taxa padrão global
-- (ver src/constants/financialRules.js). `offer_rate`/`tithe_rate` ficam
-- NULL por padrão, o que significa "use a taxa padrão global" — só é
-- preenchido quando uma fonte específica precisa de uma taxa diferente.
--
-- As colunas existem em todas as categorias (não só nas de receita) para
-- manter a tabela única, mas só têm efeito para type='expense' quando
-- explicitamente ignoradas: a regra "só receita gera oferta/dízimo" é do
-- domínio (src/domain/financialRules.js), não do schema — e o service
-- (category.service.js) recusa ativar essas flags numa categoria de
-- despesa, para não deixar configuração sem sentido salva no banco.
ALTER TABLE categories ADD COLUMN apply_offer INTEGER NOT NULL DEFAULT 0 CHECK (apply_offer IN (0, 1));
ALTER TABLE categories ADD COLUMN offer_rate REAL CHECK (offer_rate IS NULL OR (offer_rate >= 0 AND offer_rate <= 1));
ALTER TABLE categories ADD COLUMN apply_tithe INTEGER NOT NULL DEFAULT 0 CHECK (apply_tithe IN (0, 1));
ALTER TABLE categories ADD COLUMN tithe_rate REAL CHECK (tithe_rate IS NULL OR (tithe_rate >= 0 AND tithe_rate <= 1));
