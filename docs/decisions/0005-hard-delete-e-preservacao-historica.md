# ADR-0005 — Hard delete com preservação histórica explícita

Status: Accepted

## Contexto

O frontend deve refletir o estado persistido. Ao mesmo tempo, algumas estruturas dão significado a fatos históricos: apagar uma categoria ou cartão ainda referenciado romperia o histórico, enquanto excluir uma definição recorrente não precisa obrigatoriamente apagar suas ocorrências.

## Problema

Soft delete usado apenas para esconder registros gera divergência entre interface, unicidade e banco. Cascata indiscriminada apaga história sem deixar claro o impacto. Bloquear toda exclusão, por outro lado, reduz a autonomia do usuário.

## Decisão

Adotar exclusão física como semântica padrão, com regras explícitas por agregado:

- transação: remove definitivamente apenas o registro selecionado;
- categoria: hard delete somente quando não há transações ou recorrências;
- cartão: hard delete somente quando não há transações, pagamentos ou recorrências;
- recorrência: exige escolha entre preservar ocorrências, desvinculando-as, ou apagar a regra com todas as ocorrências;
- operações destrutivas em massa: preview, frase literal e transação de banco;
- limpeza financeira preserva estrutura; reset remove a estrutura financeira, mas preserva conta, sessão e settings.

Toda exclusão que pode deixar a planilha desatualizada marca a integração para exportação completa.

## Alternativas consideradas

### Soft delete generalizado

Manteria referências, mas exigiria filtros em todas as queries e poderia continuar bloqueando nomes ou cálculos mesmo quando o usuário acreditasse ter apagado o registro.

### Cascata automática em todos os vínculos

Simplificaria o comando, mas transformaria uma exclusão local em perda histórica implícita.

### Nunca permitir exclusão de dados históricos

Maximizaria retenção, porém contrariaria a autonomia solicitada e impediria correção definitiva de dados.

## Consequências

### Positivas

- Interface e banco compartilham o mesmo significado de exclusão.
- Impactos são apresentados antes das operações destrutivas.
- Vínculos históricos não desaparecem por cascata silenciosa.
- A recorrência oferece uma escolha adequada ao contexto.

### Negativas e trade-offs

- O usuário precisa remover ou ajustar dependências antes de excluir categoria/cartão.
- Preservar ocorrências desvincula parte da informação de origem.
- Excluir uma parcela isolada pode tornar o grupo incompleto.
- O sistema precisa coordenar a projeção no Google Sheets para evitar ressurreição.

## Evidências

- [`backend/src/services/category.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/category.service.js)
- [`backend/src/services/card.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/card.service.js)
- [`backend/src/repositories/recurringExpense.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/recurringExpense.repository.js)
- [`backend/src/repositories/dataManagement.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/dataManagement.repository.js)
- [`backend/tests/deletion.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/deletion.integration.test.js)
- [`backend/tests/dataManagement.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/dataManagement.integration.test.js)
- [Domínio do ciclo de vida](../domain/data-lifecycle.md)

## Relações com outros ADRs

- [ADR-0002](0002-banco-como-fonte-canonica.md): a exclusão efetiva ocorre no banco canônico.
- [ADR-0008](0008-sincronizacao-manual-idempotente.md): exportação prioritária impede reimportar registros apagados.
