# ADR-0006 — Google OAuth e sessões persistentes no backend

Status: Accepted

## Contexto

Production contém dados financeiros privados e precisa funcionar de forma persistente no Safari do iPhone. Frontend e API estão hospedados em Vercel e Render, e o processo backend pode reiniciar. A aplicação é inicialmente privada por whitelist.

## Problema

Tokens no `localStorage` ampliariam a exposição ao JavaScript. Sessões em memória desapareceriam com reinicializações. Cookies enviados diretamente entre sites distintos poderiam ter comportamento menos confiável no Safari.

## Decisão

Usar Authorization Code do Google com participação efetiva do backend:

- `state`, nonce e PKCE protegem o fluxo;
- o backend troca o código e valida assinatura, emissor, audience, expiração e e-mail verificado;
- o identificador externo estável é `google_sub`;
- whitelist normalizada é verificada no login e em toda sessão existente;
- uma sessão opaca e aleatória é persistida no banco apenas como hash;
- o navegador recebe cookie HTTP-only, `SameSite=Lax` e `Secure` em Production;
- sessões possuem expiração longa configurável e renovação na segunda metade da validade;
- logout remove a sessão persistida e expira o cookie.

O frontend Production usa `/api` no mesmo host da Vercel; o rewrite encaminha a requisição ao Render, mantendo o cookie first-party para o navegador.

## Alternativas consideradas

### Token Google ou JWT armazenado no frontend

Reduziria estado no servidor, mas exporia credenciais ao ambiente JavaScript e espalharia responsabilidade de autenticação pelo cliente.

### Sessão somente em memória

Seria simples, porém reinicializações do Render invalidariam todos os usuários imediatamente.

### Cookie cross-site direto para o domínio Render

Poderia funcionar com `SameSite=None; Secure`, mas dependeria do tratamento de cookies de terceiros, especialmente sensível no Safari.

### Framework de autenticação abrangente

Ofereceria mais provedores e abstrações, porém adicionaria complexidade desnecessária ao único fluxo atual.

## Consequências

### Positivas

- Tokens de sessão e OAuth não ficam no `localStorage`.
- Reinicializações da API não eliminam sessões persistidas.
- Remover um e-mail da whitelist invalida também sessões antigas.
- O proxy first-party favorece a persistência no Safari.

### Negativas e trade-offs

- O banco passa a fazer parte da disponibilidade da autenticação.
- Vercel precisa encaminhar corretamente `/api` ao Render.
- Rotação de secrets e limpeza de sessões exigem disciplina operacional.
- Production depende do Google para novos logins.

## Evidências

- [`backend/src/services/auth.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/auth.service.js)
- [`backend/src/services/googleOAuth.service.js`](https://github.com/felipeft/cofre/blob/main/backend/src/services/googleOAuth.service.js)
- [`backend/src/repositories/auth.repository.js`](https://github.com/felipeft/cofre/blob/main/backend/src/repositories/auth.repository.js)
- [`backend/src/database/migrations/0009_add_authentication_and_user_ownership.sql`](https://github.com/felipeft/cofre/blob/main/backend/src/database/migrations/0009_add_authentication_and_user_ownership.sql)
- [`backend/tests/auth.integration.test.js`](https://github.com/felipeft/cofre/blob/main/backend/tests/auth.integration.test.js)
- [`frontend/vercel.json`](https://github.com/felipeft/cofre/blob/main/frontend/vercel.json)

## Relações com outros ADRs

- [ADR-0001](0001-persistencia-libsql-e-turso.md): sessões persistem no mesmo banco relacional.
- [ADR-0007](0007-isolamento-multiusuario-por-user-id.md): a sessão fornece a identidade confiável usada no ownership.
- [ADR-0009](0009-builds-isolados-production-e-demo.md): a Demo substitui este fluxo por identidade fictícia local.
