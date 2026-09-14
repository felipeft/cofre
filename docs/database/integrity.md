# Integridade, constraints e índices

## Fronteiras de responsabilidade

| Garantia | Banco | Aplicação | Convenção apenas |
| --- | --- | --- | --- |
| FK existente e política CASCADE/RESTRICT | Sim | Services antecipam conflitos | — |
| Owner igual entre transação, categoria, cartão e recorrência | Triggers em INSERT/UPDATE | Todas as queries usam `user_id` | — |
| Owner igual entre pagamento e cartão | Trigger em INSERT | Não existe edição de pagamento; criação é user-scoped | UPDATE direto não tem trigger específico |
| `user_id` presente nos dados financeiros novos | Não: coluna é nullable por legado | Sim | Backfill depende de owner legado configurado |
| Tipo da categoria compatível com transação | Não | Service valida | — |
| Datas civis válidas em `YYYY-MM-DD` | Parcial, somente alguns CHECKs textuais | Zod/services validam entradas | Colunas TEXT não garantem calendário sozinhas |
| Coerência de parcelas | Não | Zod, domínio e criação atômica | Grupo não possui tabela pai |
| JSON válido em `tags`/`details_json` | Não | Serialização/parsing defensivo | TEXT pode receber JSON inválido por SQL externo |
| `updated_at` atualizado em toda mutação | Não há trigger global | Repositories suportados atualizam | Escrita SQL externa pode não atualizar |
| Uma ocorrência recorrente por mês | Índice único parcial | `INSERT OR IGNORE` e checkpoint | — |
| Uma importação por fingerprint | PK composta | Preview/fingerprint | — |
| Uma sync por chave e uma em execução por usuário | UNIQUE + índice único parcial | Repository trata replay/stale run | — |

## Chaves e integridade referencial

`PRAGMA foreign_keys = ON` é habilitado e verificado ao criar o client. Sem
isso, SQLite aceitaria referências inválidas mesmo com cláusulas `REFERENCES`.

### Cascata por usuário

Todas as tabelas que possuem FK para `users` usam `ON DELETE CASCADE`:
sessões, settings, categorias, transações, cartões, pagamentos, recorrências e
todas as tabelas user-scoped do Google Sheets. Isso torna uma eventual remoção
do usuário estruturalmente completa, embora o produto atual não exponha
exclusão de conta.

### Preservação financeira

As FKs abaixo usam `ON DELETE RESTRICT`:

- `transactions.category_id → categories.id`;
- `transactions.card_id → credit_cards.id`;
- `transactions.recurring_expense_id → recurring_expenses.id`;
- `recurring_expenses.category_id → categories.id`;
- `recurring_expenses.card_id → credit_cards.id`;
- `credit_card_payments.card_id → credit_cards.id`.

Essa política impede apagar categoria/cartão/definição enquanto a referência
existe. Na exclusão de recorrência com histórico preservado, a aplicação
primeiro define `recurring_expense_id = NULL`; no modo com histórico, apaga as
ocorrências antes da definição. Veja o
[ADR-0005](../decisions/0005-hard-delete-e-preservacao-historica.md).

## Ownership e prevenção de acesso cruzado

Além das FKs individuais, cinco triggers impedem relacionamentos entre owners:

- `transactions_owner_insert` e `transactions_owner_update` verificam
  categoria, cartão e recorrência;
- `recurring_expenses_owner_insert` e `recurring_expenses_owner_update`
  verificam categoria e cartão;
- `credit_card_payments_owner_insert` verifica cartão.

Os triggers só atuam quando `NEW.user_id IS NOT NULL`, consequência da migração
compatível com dados legados. A primeira defesa continua sendo a aplicação:
repositories selecionam, atualizam e removem usando simultaneamente id e
`user_id`, obtido da sessão. A composição é explicada no
[ADR-0007](../decisions/0007-isolamento-multiusuario-por-user-id.md).

## Constraints atuais

### Unicidade

- `users.google_sub` e `users.email` são únicos; e-mail usa `NOCASE`.
- `categories (user_id, type, name COLLATE NOCASE)` é único somente onde
  `user_id IS NOT NULL`.
- `credit_cards (user_id, name COLLATE NOCASE)` segue a mesma regra parcial.
- `transactions (recurring_expense_id, competence_year, competence_month)` é
  único onde `recurring_expense_id IS NOT NULL`.
- `google_sheets_imports (user_id, fingerprint)` é a PK composta.
- `google_sheets_sync_runs (user_id, idempotency_key)` é único.
- somente um `google_sheets_sync_runs` com `status='running'` pode existir por
  usuário.
- `schema_migrations.name` é único.

O índice de recorrência não inclui `user_id`, mas o id da definição é uma PK
global; portanto ele já identifica univocamente o owner.

### CHECKs e defaults relevantes

- enums: categoria/transação (`income|expense`), transação
  (`pending|confirmed|cancelled`), tema, status de integração e status/origem
  da sincronização;
- booleanos: `is_active`, `is_recurring`, `is_fixed` e
  `requires_full_export` ficam em `0|1`;
- valores: amounts e limite são positivos; contadores de sync/import são não
  negativos;
- calendário: mês 1–12, dias de cartão/recorrência 1–31, `end_date >=
  start_date`, ano inicial Sheets 1900–9999;
- integração `ready` exige `spreadsheet_id`;
- checkpoint de recorrência precisa casar textualmente com `YYYY-MM-01`;
- nome de exibição nulo ou entre 1 e 80 caracteres após trim;
- defaults importantes: flags `1`/`0`, status `confirmed`, source `manual` ou
  `recurring`, tema `system`, sync `manual/running`, JSON `'[]'`/`'{}'` e
  timestamps `datetime('now')`.

## Índices explícitos

Índices marcados como “legado/global” nasceram antes do modelo user-scoped e
continuam fisicamente presentes. Eles podem ajudar buscas por FK ou filtros
isolados, mas se sobrepõem parcialmente aos compostos adicionados na 0015.

| Tabela | Índice | Colunas/filtro | Consulta favorecida |
| --- | --- | --- | --- |
| `categories` | `idx_categories_is_active` | `is_active` | filtro global legado por ativo |
|  | `idx_categories_user_type_name` | `user_id,type,name NOCASE`, UNIQUE parcial | duplicidade e busca por nome/tipo do owner |
|  | `idx_categories_user_id` | `user_id` | listagem/cleanup por owner |
| `credit_cards` | `idx_credit_cards_is_active` | `is_active` | filtro global legado por ativo |
|  | `idx_credit_cards_user_name` | `user_id,name NOCASE`, UNIQUE parcial | duplicidade por owner |
|  | `idx_credit_cards_user_id` | `user_id` | listagem/cleanup por owner |
| `transactions` | `idx_transactions_date` | `date` | ordenação/filtro legado por data |
|  | `idx_transactions_category_id` | `category_id` | vínculo e preview de categoria |
|  | `idx_transactions_type` | `type` | filtro legado por tipo |
|  | `idx_transactions_competence` | `competence_year,competence_month` | competência global legada |
|  | `idx_transactions_card_id` | `card_id` | vínculo de cartão |
|  | `idx_transactions_installment_group_id` | `installment_group_id` | localizar parcelas irmãs |
|  | `idx_transactions_recurring_expense_id` | `recurring_expense_id` | localizar ocorrências |
|  | `idx_transactions_recurring_expense_competence` | recorrência, ano, mês; UNIQUE parcial | idempotência mensal |
|  | `idx_transactions_user_id` | `user_id` | ownership genérico |
|  | `idx_transactions_user_competence` | `user_id,year,month,status` | summaries e consultas mensais |
|  | `idx_transactions_user_date` | `user_id,date DESC,id DESC` | histórico user-scoped ordenado |
|  | `idx_transactions_user_card_status` | `user_id,card_id,status` | limite do cartão |
|  | `idx_transactions_user_recurring` | `user_id,recurring_expense_id` | reconciliação/remoção de recorrência |
| `recurring_expenses` | `idx_recurring_expenses_active` | `is_active` | filtro global legado |
|  | `idx_recurring_expenses_category_id` | `category_id` | vínculo de categoria |
|  | `idx_recurring_expenses_card_id` | `card_id` | vínculo de cartão |
|  | `idx_recurring_expenses_user_id` | `user_id` | ownership genérico |
|  | `idx_recurring_expenses_user_active` | `user_id,is_active,generated_through` | regras pendentes para reconciliação |
| `credit_card_payments` | `idx_credit_card_payments_card_id` | `card_id` | pagamentos do cartão |
|  | `idx_credit_card_payments_paid_at` | `paid_at` | ordem/filtro global legado |
|  | `idx_credit_card_payments_user_id` | `user_id` | ownership genérico |
|  | `idx_card_payments_user_card` | `user_id,card_id,paid_at DESC` | cálculo user-scoped do limite |
| `sessions` | `idx_sessions_user_id` | `user_id` | invalidação/cascata por usuário |
|  | `idx_sessions_expires_at` | `expires_at` | expurgo e busca de validade |
| `oauth_login_attempts` | `idx_oauth_login_attempts_expires_at` | `expires_at` | expurgo de tentativas expiradas |
| `google_sheets_oauth_attempts` | `idx_google_sheets_oauth_attempts_user_id` | `user_id` | tentativa do usuário |
|  | `idx_google_sheets_oauth_attempts_expires_at` | `expires_at` | expurgo de tentativas expiradas |
| `google_sheets_sync_runs` | `idx_google_sheets_sync_runs_one_running_per_user` | `user_id WHERE status='running'`, UNIQUE | exclusão mútua |
|  | `idx_google_sheets_sync_runs_user_started` | `user_id,started_at DESC,id DESC` | último status e histórico |

Além deles, SQLite/libSQL cria autoíndices para PKs textuais/compostas e
constraints `UNIQUE`, como os de `users`, `sessions`, tentativas OAuth,
imports, sync runs e `schema_migrations`. PKs `INTEGER` usam o rowid e não
necessitam de autoíndice separado.

## Atomicidade

A fachada `database.transaction()` abre uma transação libSQL, faz commit no
retorno e rollback em exceção. Ela é usada em:

- cada migration e seu registro em `schema_migrations`;
- consumo único de tentativas OAuth;
- associação dos dados legados a um usuário;
- criação das N parcelas;
- importação Sheets e registro do fingerprint;
- início idempotente de uma sincronização;
- exclusão de categoria/cartão/transação junto da marca de exportação;
- exclusão de recorrência com preservação ou purge;
- limpeza e reset user-scoped.

A reconciliação de recorrências usa um `batch` de escrita com inserts
idempotentes e avanço de checkpoint. A criação de parcelas, por sua vez, usa
uma transação explícita porque todas as linhas precisam existir ou nenhuma.

## Exclusão, reset e Google Sheets

Exclusões são físicas. Services calculam impacto antes da confirmação e as FKs
RESTRICT são a última barreira para entidades referenciadas. Limpeza e reset
apagam em ordem explícita dentro de transação para respeitar dependências.

Após mutações destrutivas, `google_sheets_integrations.requires_full_export`
é marcado. A sincronização exporta o banco canônico antes de considerar
importações, impedindo que linhas apagadas na aplicação reapareçam vindas da
planilha. Esse comportamento combina constraint local, transação e decisão de
aplicação; não é garantido somente pelo schema.

## Dívidas e limites observados

1. Os cinco `user_id` financeiros são nullable no banco por compatibilidade
   com o legado. Fluxos normais são seguros, mas SQL externo ainda pode criar
   linhas sem owner e contornar triggers condicionados.
2. Existe trigger de ownership para INSERT de pagamento, mas não para UPDATE.
   Hoje não há endpoint/repository de edição; uma escrita SQL externa poderia
   produzir owner divergente.
3. `date`, `paid_at`, timestamps, `tags` e `details_json` são TEXT sem CHECK de
   calendário/JSON. A integridade depende da aplicação.
4. O banco não impõe `installment_current <= installment_total`, positividade
   das parcelas nem presença conjunta com `installment_group_id`.
5. `updated_at` depende dos repositories; não existe trigger universal.
6. A coluna textual `transactions.card` permanece fisicamente por legado,
   embora o contrato atual use exclusivamente `card_id`.
7. Índices simples antigos coexistem com índices user-scoped compostos. A
   redundância deve ser avaliada por planos de consulta e volume antes de uma
   eventual migration de remoção.
8. `generated_through` valida o formato por `GLOB`, mas não valida mês civil;
   os services geram o valor correto.

Esses pontos são documentação do estado atual, não mudanças propostas nesta
etapa.
