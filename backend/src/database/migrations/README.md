# Migrations

Cada migration é um arquivo `.sql` nomeado com um prefixo numérico sequencial
e uma descrição curta:

```
0001_create_categories_table.sql
0002_create_transactions_table.sql
0003_add_user_id_to_transactions.sql
```

O runner (`src/database/migrate.js`) aplica os arquivos desta pasta em ordem
alfabética (por isso o prefixo numérico) e registra cada um aplicado na
tabela `schema_migrations`, criada automaticamente. Migrations já aplicadas
nunca rodam de novo.

A partir de `0001_create_categories_table.sql` e
`0002_create_transactions_table.sql`, o domínio financeiro (categorias e
transações) passou a existir de verdade — a tabela `schema_migrations`
(criada automaticamente pelo runner, não como um arquivo aqui) garante que
cada uma delas roda exatamente uma vez.

`0003` e `0004` (Fase 3, Etapa 7) adicionam as regras de oferta/dízimo —
ver o README principal do backend para a explicação completa da regra.
