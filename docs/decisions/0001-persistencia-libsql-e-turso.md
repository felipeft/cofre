# ADR-0001 — Persistência relacional SQLite-compatible com libSQL e Turso

Status: Accepted

## Contexto

O Cofre precisa executar localmente sem infraestrutura obrigatória e, em Production, persistir dados e sessões fora do ciclo de vida efêmero do processo no Render. O modelo contém relações, constraints, índices, triggers e operações atômicas, e evolui por migrations SQL sequenciais.

O código atual usa `@libsql/client` tanto para um arquivo local quanto para uma URL Turso.

## Problema

Manter comportamentos de banco diferentes entre desenvolvimento, testes e Production aumentaria o risco de migrations e regras de integridade funcionarem em apenas um ambiente. Persistência em memória ou no filesystem do Render também não sobreviveria de forma confiável a reinicializações.

## Decisão

Adotar persistência relacional SQLite-compatible por meio de uma fachada assíncrona sobre `@libsql/client`:

- arquivo `file:` no desenvolvimento e nos testes;
- Turso/libSQL remoto em Production;
- mesma interface de `prepare`, `batch` e `transaction` para os dois modos;
- foreign keys habilitadas;
- acesso serializado com `concurrency: 1` para a carga atual;
- migrations SQL numeradas, forward-only, aplicadas automaticamente no bootstrap e registradas em `schema_migrations`.

Somente o backend acessa o banco. Frontend Production usa a API; a Demo usa armazenamento próprio no navegador.

## Alternativas consideradas

### SQLite local também em Production

Manteria simplicidade, mas dependeria do filesystem e do ciclo de vida da instância do Render, inadequados para sessões e dados persistentes.

### Banco relacional de outro dialeto

Poderia oferecer outra estratégia de escala, mas exigiria adaptar SQL, migrations e comportamento entre ambientes sem necessidade demonstrada pela carga atual.

### Acesso direto do frontend ao banco

Eliminaria parte da API, mas exporia credenciais e deslocaria autorização, validação e regras financeiras para um cliente não confiável.

## Consequências

### Positivas

- Desenvolvimento e testes continuam locais e baratos.
- Production possui persistência independente do processo da API.
- O mesmo SQL cobre constraints, índices e transações nos dois ambientes.
- Migrations são aplicadas antes de a API aceitar tráfego.

### Negativas e trade-offs

- O projeto fica ligado à compatibilidade SQLite/libSQL.
- `concurrency: 1` favorece previsibilidade, não throughput elevado.
- Migrations forward-only exigem cuidado: arquivos aplicados não devem ser reescritos.
- Disponibilidade de Production depende de Render e Turso.

## Evidências

- [`backend/src/database/connection.js`](../../backend/src/database/connection.js)
- [`backend/src/database/migrate.js`](../../backend/src/database/migrate.js)
- [`backend/src/database/bootstrap.js`](../../backend/src/database/bootstrap.js)
- [`backend/src/database/migrations/`](../../backend/src/database/migrations/README.md)
- [`backend/tests/migrationAuth.integration.test.js`](../../backend/tests/migrationAuth.integration.test.js)

## Relações com outros ADRs

- [ADR-0006](0006-google-oauth-e-sessoes-no-backend.md): sessões usam esta persistência.
- [ADR-0007](0007-isolamento-multiusuario-por-user-id.md): ownership também é reforçado no banco.
- [ADR-0009](0009-builds-isolados-production-e-demo.md): a Demo deliberadamente não usa esta camada.
