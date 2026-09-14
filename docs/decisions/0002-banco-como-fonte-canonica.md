# ADR-0002 — Banco da aplicação como fonte canônica

Status: Accepted

## Contexto

O Cofre nasceu para substituir o uso principal de uma planilha, mas preserva Google Sheets como visão anual e ponto de entrada conveniente. O domínio inclui relações e operações que uma planilha livre não consegue garantir sozinha: ownership, cartões, parcelas, recorrências, status, exclusões e atomicidade.

## Problema

Se banco e planilha fossem autoridades equivalentes, alterações concorrentes ou estruturalmente inválidas exigiriam merge bidirecional de todo o domínio. IDs removidos poderiam reaparecer, e edições livres poderiam romper referências ou snapshots históricos.

## Decisão

O banco acessado pelo backend é a fonte canônica dos dados.

Google Sheets é uma integração secundária:

- recebe uma projeção anual legível do estado do Cofre;
- pode acrescentar novas despesas simples;
- não pode editar livremente transações existentes;
- não cria receitas, parcelamentos ou recorrências;
- deve respeitar categoria, cartão e ownership já conhecidos pelo Cofre;
- é sobrescrita pelo estado canônico durante a exportação.

A planilha não é tratada como backup restaurável completo: é uma projeção e uma fronteira de importação controlada.

## Alternativas consideradas

### Google Sheets como fonte primária

Facilitaria edição manual, mas transferiria integridade, concorrência e identidade para uma estrutura permissiva e sujeita a alterações de layout.

### Replicação bidirecional simétrica

Permitiria editar qualquer campo nos dois lados, mas exigiria versionamento por registro, merge e políticas para relações complexas. O custo não é proporcional ao uso atual.

### Exportação somente leitura

Seria a opção mais simples, mas eliminaria o caso útil de cadastrar despesas simples diretamente na planilha.

## Consequências

### Positivas

- Existe uma autoridade clara para resolver divergências.
- Regras financeiras permanecem no backend.
- A planilha continua útil sem poder corromper estruturas complexas.
- Mudanças feitas no Cofre podem substituir uma visão remota desatualizada.

### Negativas e trade-offs

- A planilha não oferece edição bidirecional completa.
- Usuários precisam corrigir transações existentes no Cofre.
- A projeção não substitui uma estratégia independente de backup do banco.

## Evidências

- [`backend/src/services/googleSheets.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/googleSheets.service.js)
- [`backend/src/repositories/googleSheetsData.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/googleSheetsData.repository.js)
- [`backend/src/utils/mappers/googleSheets.mapper.js`](https://github.com/felipeft/cofre/blob/main/backend/src/utils/mappers/googleSheets.mapper.js)
- [`backend/tests/googleSheets.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/googleSheets.integration.test.js)
- [Domínio da sincronização](../domain/google-sheets-sync.md)

## Relações com outros ADRs

- [ADR-0008](0008-sincronizacao-manual-idempotente.md) define como a integração converge sem disputar autoridade.
- [ADR-0005](0005-hard-delete-e-preservacao-historica.md) define o significado das exclusões que precisam ser refletidas na planilha.
