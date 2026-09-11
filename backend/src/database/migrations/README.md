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

As migrations seguintes preservam a mesma sequência: `0009` introduz usuários
e ownership, `0010` preferências individuais, `0011` a integração Google
Sheets, `0012` o histórico idempotente de sincronizações e `0013` a
preferência individual de tema (`system`, `light` ou `dark`). A `0014`
simplifica definitivamente categorias, transações e configurações, preservando
os registros existentes e removendo colunas de uma funcionalidade descontinuada.
A `0015` acrescenta o checkpoint de reconciliação das recorrências, o marcador
de exportação obrigatória do Google Sheets e índices para competências, cartões,
datas e vínculos recorrentes.
