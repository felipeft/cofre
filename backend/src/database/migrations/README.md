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

Esta pasta está **intencionalmente vazia** nesta etapa: a infraestrutura de
migrations existe e funciona (veja `npm run migrate`), mas a criação das
tabelas de negócio (`categories`, `transactions`, etc.) é responsabilidade da
etapa de CRUD, não desta etapa de infraestrutura.
