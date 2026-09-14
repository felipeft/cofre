# ADR-0004 — Recorrências com definição e ocorrências materializadas

Status: Accepted

## Contexto

O Cofre precisa exibir despesas mensais no passado, presente e futuro. Alterar uma assinatura não deve reescrever meses já gerados, e consultar repetidamente o mesmo período não pode duplicar lançamentos.

## Problema

Calcular recorrências apenas em memória durante cada consulta perderia identidade, status, edições e exclusões individuais. Gerar indefinidamente no momento do cadastro seria impossível, e depender de um agendador adicionaria infraestrutura não necessária ao uso atual.

## Decisão

Separar a definição recorrente de suas ocorrências:

- `recurring_expenses` descreve a regra mensal;
- cada ocorrência gerada é uma transação normal ligada à definição;
- geração acontece sob demanda até o horizonte consultado;
- uma chave única por definição e competência impede duplicação;
- `generated_through` registra o último mês conciliado;
- inserts e avanço do checkpoint ocorrem no mesmo lote;
- mudanças da definição afetam apenas ocorrências ainda não materializadas.

Não há sincronização automática ou scheduler no estado atual.

## Alternativas consideradas

### Ocorrências virtuais calculadas em toda leitura

Evitaria persistência adicional, mas não suportaria cancelamento, edição, exclusão individual ou snapshot dos valores efetivos.

### Geração antecipada por prazo fixo

Seria simples, porém criaria um horizonte arbitrário e exigiria manutenção periódica.

### Job agendado

Automatizaria a geração, mas acrescentaria scheduler, observabilidade e tratamento de falhas sem necessidade para o volume e o fluxo atuais.

## Consequências

### Positivas

- Ocorrências participam das mesmas consultas e regras das demais transações.
- Histórico já materializado não muda quando a definição muda.
- Consultas futuras podem projetar compromissos.
- Checkpoint torna o custo proporcional ao delta após a primeira conciliação.

### Negativas e trade-offs

- Uma consulta pode causar escrita ao materializar o horizonte solicitado.
- Alterar datas da definição reinicia o checkpoint; a documentação de domínio registra o risco de reavaliar uma ocorrência previamente excluída.
- Cartão inativo pode interromper novas ocorrências até ajuste da regra.
- A geração automática por tempo permanece fora do escopo.

## Evidências

- [`backend/src/domain/recurringExpense.js`](../../backend/src/domain/recurringExpense.js)
- [`backend/src/services/recurringExpense.service.js`](../../backend/src/services/recurringExpense.service.js)
- [`backend/src/repositories/recurringExpense.repository.js`](../../backend/src/repositories/recurringExpense.repository.js)
- [`backend/src/database/migrations/0007_create_recurring_expenses.sql`](../../backend/src/database/migrations/0007_create_recurring_expenses.sql)
- [`backend/src/database/migrations/0015_optimize_recurring_and_data_management.sql`](../../backend/src/database/migrations/0015_optimize_recurring_and_data_management.sql)
- [`backend/tests/recurringExpenses.integration.test.js`](../../backend/tests/recurringExpenses.integration.test.js)

## Relações com outros ADRs

- [ADR-0003](0003-parcelamentos-como-transacoes-agrupadas.md): ambos materializam compromissos como transações, mas com identidades e calendários distintos.
- [ADR-0005](0005-hard-delete-e-preservacao-historica.md): define os dois destinos possíveis das ocorrências ao excluir a regra.
