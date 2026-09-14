# ADR-0008 — Sincronização manual idempotente com Google Sheets

Status: Accepted

## Contexto

Google Sheets permite novas despesas simples e recebe o estado anual do Cofre. Repetições por timeout, cliques duplicados, linhas alteradas e exclusões ainda não refletidas podem gerar duplicatas, conflitos ou ressuscitar registros.

## Problema

Uma sequência ingênua de “importar e depois exportar” interpretaria linhas antigas como novas após uma exclusão local. Last-write-wins sobrescreveria divergências sem informar o usuário. Execuções concorrentes poderiam importar o mesmo conjunto mais de uma vez.

## Decisão

Implementar uma camada própria de sincronização manual:

- cada execução recebe chave idempotente por usuário;
- somente uma execução pode permanecer `running` por usuário;
- execuções interrompidas são marcadas como falha recuperável;
- leitura produz preview classificado em novo, existente, inválido e conflitante;
- fingerprint representa o conjunto importável e é recalculado na confirmação;
- importação é transacional e registra fingerprints já consumidos;
- qualquer conflito impede a importação do lote;
- após mutações destrutivas, `requires_full_export` força exportação antes da leitura;
- em execução normal, importação válida é seguida da exportação do estado canônico;
- status, contagens, erros e detalhes limitados ficam no histórico.

Sincronização automática permanece posterior e não é simulada como funcionalidade atual.

## Alternativas consideradas

### Last-write-wins

Seria simples, mas ocultaria conflitos e poderia sobrescrever histórico sem explicação.

### Importar sempre antes de exportar

Permitiria que uma linha apagada localmente reaparecesse antes de a planilha ser atualizada.

### Sincronização automática em background

Reduziria ação manual, mas exigiria scheduler, retries, observabilidade e política de conflitos sem interação imediata do usuário.

### Idempotência somente no frontend

Não protegeria contra repetição após falha de rede, múltiplas abas ou chamadas diretas à API.

## Consequências

### Positivas

- Repetir a mesma solicitação não duplica despesas.
- Conflitos ficam visíveis e auditáveis.
- Exclusões locais não reaparecem pela planilha.
- Falhas externas não modificam parcialmente o banco canônico.

### Negativas e trade-offs

- O fluxo exige armazenamento adicional de execuções e fingerprints.
- Uma única linha conflitante bloqueia o lote inteiro.
- Exportação completa após exclusões pode custar mais chamadas à API Google.
- O usuário ainda precisa iniciar a sincronização manualmente.

## Evidências

- [`backend/src/services/googleSheetsSync.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/googleSheetsSync.service.js)
- [`backend/src/repositories/googleSheetsSync.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/googleSheetsSync.repository.js)
- [`backend/src/repositories/googleSheetsData.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/googleSheetsData.repository.js)
- [`backend/src/database/migrations/0012_create_google_sheets_sync_runs.sql`](https://github.com/felipeft/cofre/blob/main/backend/src/database/migrations/0012_create_google_sheets_sync_runs.sql)
- [`backend/src/database/migrations/0015_optimize_recurring_and_data_management.sql`](https://github.com/felipeft/cofre/blob/main/backend/src/database/migrations/0015_optimize_recurring_and_data_management.sql)
- [`backend/tests/googleSheets.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/googleSheets.integration.test.js)

## Relações com outros ADRs

- [ADR-0002](0002-banco-como-fonte-canonica.md) define a direção de autoridade.
- [ADR-0005](0005-hard-delete-e-preservacao-historica.md) origina a necessidade de refletir exclusões antes da importação.
- [ADR-0007](0007-isolamento-multiusuario-por-user-id.md) delimita chaves e histórico por usuário.
