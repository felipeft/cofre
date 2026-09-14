# ADR-0007 — Isolamento multiusuário por `user_id`

Status: Accepted

## Contexto

O Cofre evoluiu de um modelo sem autenticação para uma aplicação user-scoped. Todas as entidades privadas — incluindo categorias, transações, cartões, recorrências, pagamentos, settings e integração Google — precisam ser acessíveis apenas pelo respectivo proprietário.

## Problema

Filtrar somente no frontend não oferece segurança. Filtrar apenas em alguns endpoints permite IDOR, e depender exclusivamente da disciplina dos services não impede que uma gravação incorreta forme relações entre recursos de usuários diferentes.

## Decisão

Usar `user_id` como fronteira de ownership no banco e propagá-lo a partir da sessão autenticada:

- endpoints não aceitam `userId` do cliente para escolher o proprietário;
- controllers extraem `req.user.id`;
- services e repositories recebem esse ID confiável;
- queries combinam ID do recurso e `user_id`;
- unicidade de nomes é por usuário;
- foreign keys e triggers rejeitam relações cross-user;
- sessões, settings e integrações também são user-scoped;
- migrations preservam dados anteriores apenas por associação explícita ao proprietário legado configurado.

## Alternativas consideradas

### Uma instância ou banco por usuário

Criaria isolamento forte, mas multiplicaria provisionamento, migrations e operação para uma aplicação pequena.

### Ownership somente na camada de aplicação

Seria mais simples no schema, porém um erro de repository poderia persistir relações inválidas sem defesa adicional.

### Usuário enviado pelo frontend

Facilitaria chamadas, mas permitiria manipulação trivial do proprietário e acesso por troca de ID.

## Consequências

### Positivas

- Recursos de IDs previsíveis não ficam acessíveis entre usuários.
- Nomes iguais podem coexistir em contas diferentes.
- O banco reforça relações que o service já valida.
- Operações destrutivas e sincronizações permanecem limitadas ao usuário atual.

### Negativas e trade-offs

- Toda query privada precisa carregar o filtro de ownership.
- Migrations do modelo single-user exigiram estratégia explícita para dados legados.
- Testes precisam criar pelo menos dois usuários para validar ausência de vazamento.
- Um banco compartilhado continua exigindo disciplina em novas tabelas e queries.

## Evidências

- [`backend/src/routes/index.js`](https://github.com/felipeft/cofre/blob/main/backend/src/routes/index.js)
- [`backend/src/middlewares/auth.middleware.js`](https://github.com/felipeft/cofre/blob/main/backend/src/middlewares/auth.middleware.js)
- [`backend/src/database/migrations/0009_add_authentication_and_user_ownership.sql`](https://github.com/felipeft/cofre/blob/main/backend/src/database/migrations/0009_add_authentication_and_user_ownership.sql)
- [`backend/src/repositories/transaction.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/transaction.repository.js)
- [`backend/tests/auth.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/auth.integration.test.js)
- [`backend/tests/dataManagement.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/dataManagement.integration.test.js)
- [Invariantes de ownership](../domain/ownership-and-invariants.md)

## Relações com outros ADRs

- [ADR-0006](0006-google-oauth-e-sessoes-no-backend.md) estabelece a origem confiável da identidade.
- [ADR-0008](0008-sincronizacao-manual-idempotente.md) aplica o mesmo escopo a execuções e fingerprints.
