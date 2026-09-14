# ADR-0003 — Parcelamentos como transações agrupadas

Status: Accepted

## Contexto

Dashboard, histórico e análises trabalham sobre transações por competência. Uma compra parcelada distribui compromissos por vencimentos mensais e precisa preservar a soma exata do valor original.

## Problema

Representar a compra como uma única linha exigiria recalcular parcelas virtuais em todas as consultas. Representar simultaneamente uma compra-pai com valor total e parcelas financeiras criaria risco de contagem duplicada.

## Decisão

Materializar uma compra parcelada como exatamente `N` transações:

- uma por parcela;
- sem transação adicional para o total original;
- todas ligadas por `installment_group_id`;
- cada uma com posição atual e total de parcelas;
- data e competência determinadas pelo vencimento daquela parcela;
- persistência atômica do grupo inteiro;
- diferença de arredondamento absorvida pela última parcela.

Edição ou exclusão atua somente na parcela selecionada. Não há hoje operação agregada de replanejamento do grupo.

## Alternativas consideradas

### Uma única transação com cronograma calculado na leitura

Reduziria linhas, mas complicaria filtros, histórico, limite e edições por competência.

### Compra-pai mais parcelas-filhas

Preservaria explicitamente o valor original, porém exigiria definir qual nível participa de cada agregação e impedir contagem duplicada em todos os consumidores.

### Uma transação total e metadados de parcela

Não representaria adequadamente competências e vencimentos individuais.

## Consequências

### Positivas

- Parcelas entram naturalmente em histórico, análises e previsões mensais.
- Cada parcela possui data, competência e status próprios.
- A soma é determinística e testável.
- Falhas não deixam grupos parcialmente gravados.

### Negativas e trade-offs

- Uma compra cria múltiplas linhas.
- Alterar uma parcela não redistribui automaticamente as demais.
- Excluir uma parcela pode fazer o grupo deixar de somar o valor original; isso é uma ação explícita do usuário.
- O grupo identifica origem comum, mas não é uma entidade de compra com lifecycle próprio.

## Evidências

- [`backend/src/domain/installmentPlan.js`](../../backend/src/domain/installmentPlan.js)
- [`backend/src/services/transaction.service.js`](../../backend/src/services/transaction.service.js)
- [`backend/src/repositories/transaction.repository.js`](../../backend/src/repositories/transaction.repository.js)
- [`backend/tests/installmentPlan.unit.test.js`](../../backend/tests/installmentPlan.unit.test.js)
- [`backend/tests/cards.integration.test.js`](../../backend/tests/cards.integration.test.js)
- [Domínio de cartões e parcelamentos](../domain/credit-cards-and-installments.md)

## Relações com outros ADRs

- [ADR-0005](0005-hard-delete-e-preservacao-historica.md): exclusão permanece explícita e atua sobre o fato selecionado.
