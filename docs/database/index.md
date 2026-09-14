# Banco de dados do Cofre

Esta seção documenta o modelo relacional efetivamente produzido pelas
migrations `0001` a `0015`. As migrations e o código de persistência são a
fonte de verdade; entidades conceituais do domínio só aparecem aqui quando
possuem representação física.

## Navegação

- [Modelo de dados e diagrama ER](data-model.md)
- [Migrations e evolução do schema](migrations.md)
- [Constraints, índices e integridade](integrity.md)

## Visão geral

O schema atual possui **14 tabelas**:

| Área | Tabelas |
| --- | --- |
| Identidade e sessão | `users`, `sessions`, `oauth_login_attempts` |
| Preferências | `user_settings` |
| Financeiro | `categories`, `transactions`, `credit_cards`, `credit_card_payments`, `recurring_expenses` |
| Google Sheets | `google_sheets_integrations`, `google_sheets_oauth_attempts`, `google_sheets_imports`, `google_sheets_sync_runs` |
| Infraestrutura | `schema_migrations` |

Não existem tabelas de fatura, parcela, grupo de parcelamento, dashboard ou
análise. Uma compra parcelada é materializada como várias linhas em
`transactions` ligadas por `installment_group_id`. O limite do cartão e os
resumos financeiros são calculados por consultas e regras de domínio.

## Ambientes de persistência

O backend usa `@libsql/client` atrás de uma fachada única. A escolha do
provider é determinada pela configuração, e não diretamente pelo nome do
ambiente:

- **fora de testes, com `TURSO_DATABASE_URL`:** usa o banco remoto Turso/libSQL
  e o respectivo token;
- **fora de testes, sem `TURSO_DATABASE_URL`:** usa um arquivo local `file:` no
  caminho configurado por `DATABASE_PATH`;
- **testes:** sempre usam arquivos locais temporários; a configuração ignora
  Turso quando `NODE_ENV=test` para impedir acesso acidental ao banco real.

A conexão habilita e verifica `PRAGMA foreign_keys = ON`, usa inteiros como
`number` e limita a concorrência do client a uma fila. A API de repositories é
a mesma nos dois ambientes. Essa escolha está registrada no
[ADR-0001](../decisions/0001-persistencia-libsql-e-turso.md).

## Convenções físicas

- Chaves numéricas usam `INTEGER PRIMARY KEY AUTOINCREMENT`, salvo relações
  1:1 que usam `user_id` como PK e chaves opacas como hashes/fingerprints.
- Valores monetários usam `REAL`; arredondamento monetário é responsabilidade
  do domínio/aplicação.
- Booleanos usam `INTEGER` (`0`/`1`), com `CHECK` onde foram declarados.
- Datas e timestamps usam `TEXT`. `datetime('now')` grava timestamps UTC no
  formato do SQLite; datas financeiras seguem por convenção `YYYY-MM-DD`.
- JSON (`tags`, detalhes de sincronização) é armazenado como `TEXT` e
  serializado pela aplicação.
- `updated_at` não possui trigger global: os repositories o atualizam
  explicitamente nas mutações que suportam.

## Documentos relacionados

- [Arquitetura de persistência](../architecture/database.md)
- [Domínio financeiro](../domain/index.md)
- [ADRs](../decisions/index.md)
- [Contrato HTTP](../api/index.md)
