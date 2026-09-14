# Migrations

## Estratégia atual

As migrations são arquivos SQL **forward-only**, numerados e ordenados
lexicograficamente. No bootstrap do backend:

1. a fachada libSQL habilita foreign keys;
2. o migrator cria `schema_migrations` se necessário;
3. compara nomes de arquivos com os nomes já registrados;
4. aplica cada arquivo pendente em sua própria transação;
5. registra o nome na mesma transação da alteração de schema.

Assim, uma falha não marca a migration como aplicada e provoca rollback da
unidade atual. Executar novamente sem arquivos pendentes é idempotente. Não há
migrations `down`, checksum ou reescrita automática de arquivos já aplicados;
correções devem entrar em um novo número sequencial.

O mesmo mecanismo atende arquivo local e Turso por meio da fachada descrita no
[ADR-0001](../decisions/0001-persistencia-libsql-e-turso.md).

## Cronologia

| Migration | Evolução |
| --- | --- |
| `0001_create_categories_table.sql` | Cria categorias, enum de tipo, flag ativa e unicidade global por tipo/nome. |
| `0002_create_transactions_table.sql` | Cria o fato financeiro, competência, estado, campos iniciais de recorrência/parcelamento e índices de consulta. |
| `0003_add_financial_rules_to_categories.sql` | Adicionou campos de uma regra pessoal antiga de oferta/dízimo. É história do schema, não funcionalidade atual. |
| `0004_add_income_obligations_to_transactions.sql` | Adicionou snapshots daquela regra antiga. Também é apenas histórico. |
| `0005_create_credit_cards_table.sql` | Cria cartões com limite e ciclo. |
| `0006_add_card_and_installment_group_to_transactions.sql` | Introduz `card_id` relacional e `installment_group_id`; mantém a coluna textual `card` por compatibilidade. |
| `0007_create_recurring_expenses.sql` | Separa definição recorrente de ocorrências e cria a unicidade por competência. |
| `0008_create_credit_card_payments.sql` | Cria pagamentos que liberam limite sem gerar nova despesa. |
| `0009_add_authentication_and_user_ownership.sql` | Cria usuários, sessões e tentativas OAuth; adiciona `user_id`, unicidade por usuário e triggers anti-ownership cruzado. |
| `0010_create_user_settings.sql` | Adiciona nome de exibição, settings 1:1, backfill e trigger de criação. Os defaults financeiros originais foram removidos depois. |
| `0011_create_google_sheets_integrations.sql` | Cria autorização, vínculo da planilha e ledger de importações. |
| `0012_create_google_sheets_sync_runs.sql` | Cria histórico, idempotência e exclusão mútua das sincronizações. |
| `0013_add_theme_to_user_settings.sql` | Adiciona preferência visual `system/light/dark`. |
| `0014_simplify_financial_model.sql` | Remove definitivamente todos os campos de oferta/dízimo de categorias, transações e settings, preservando os registros restantes. |
| `0015_optimize_recurring_and_data_management.sql` | Adiciona checkpoint de recorrência, marca de exportação integral e índices compostos user-scoped. |

## Banco novo e banco evoluído

Um banco novo percorre todas as migrations e termina no mesmo modelo descrito
em [data-model.md](data-model.md). Um banco existente executa apenas arquivos
ausentes. A migration 0015 preenche `generated_through` com a competência mais
recente já materializada, evitando reprocessar todo o histórico após upgrade.

A migration 0009 não atribui silenciosamente registros anteriores a qualquer
usuário: os cinco `user_id` adicionados são nullable. A associação acontece
explicitamente no login do e-mail configurado como owner legado, dentro de uma
transação. Essa compatibilidade explica por que o schema atual ainda admite
linhas financeiras sem owner, embora os fluxos normais sempre gravem owner.

## Limites operacionais

- O migrator identifica uma migration apenas pelo nome; alteração posterior no
  conteúdo de um arquivo já aplicado não é detectada.
- Não existe lock de migrations explícito no schema. A implantação atual deve
  evitar bootstraps concorrentes aplicando o mesmo arquivo pela primeira vez.
- Não há rollback automatizado. Recuperação exige nova migration ou restauração
  operacional do banco.
- Migrations antigas preservam comentários e colunas que existiram no passado;
  somente o schema após `0015` representa o produto atual.
