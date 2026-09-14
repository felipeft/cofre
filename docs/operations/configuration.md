# Configuração e variáveis de ambiente

Arquivos `.env` contêm configuração local e não devem ser versionados. Production
recebe secrets pelo painel do provedor. Variáveis `VITE_*` são incorporadas ao
bundle do navegador e nunca devem conter segredo.

## Backend

A validação central está em `backend/src/config/env.schema.js`. Em
`NODE_ENV=production`, o processo falha na inicialização se uma variável marcada
como obrigatória abaixo estiver ausente ou inválida.

### Processo e rede

| Variável | Production | Default/validação | Uso |
| --- | --- | --- | --- |
| `PORT` | Fornecida normalmente pelo Render | `3000`; inteiro positivo | Porta HTTP |
| `NODE_ENV` | **Obrigatória operacionalmente:** `production` | `development`; aceita `development`, `test`, `production` | Segurança de cookie, mensagens de erro e requisitos de config |
| `LOG_LEVEL` | Opcional | `info`; `debug`, `info`, `warn`, `error` | Nível mínimo dos logs JSON |
| `FRONTEND_URLS` | Deve ser configurada explicitamente | `http://localhost:5173`; lista CSV de URLs | Origins autorizadas por CORS e CSRF |

`FRONTEND_URL` singular é aceito apenas como fallback legado com aviso. O nome
canônico é `FRONTEND_URLS`. Barras finais são removidas durante a normalização.

### Banco

| Variável | Production | Default/validação | Uso |
| --- | --- | --- | --- |
| `DATABASE_PATH` | Ignorada quando Turso está ativo | `./src/database/cofre.db` | Arquivo local libSQL/SQLite |
| `TURSO_DATABASE_URL` | **Obrigatória** | URL válida; deve coexistir com o token | Endpoint libSQL remoto |
| `TURSO_AUTH_TOKEN` | **Obrigatória** | String não vazia; deve coexistir com a URL | Credencial do Turso |

Em `NODE_ENV=test`, URL e token do Turso são ignorados intencionalmente. Fora de
testes, a presença de `TURSO_DATABASE_URL` seleciona o remoto; sem ela, usa-se o
arquivo definido por `DATABASE_PATH`. O provider não é escolhido apenas pelo nome
do ambiente.

### Autenticação e sessão

| Variável | Production | Default/validação | Uso |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | **Obrigatória** | String não vazia | Cliente OAuth Web e audiência do ID token |
| `GOOGLE_CLIENT_SECRET` | **Obrigatória** | String não vazia | Troca de código OAuth no backend |
| `GOOGLE_CALLBACK_URL` | **Obrigatória** | URL válida | Callback do login e origem do redirect ao frontend |
| `AUTH_ALLOWED_EMAILS` | **Obrigatória** | CSV normalizado para minúsculas; ao menos um em Production | Whitelist verificada em cada sessão |
| `AUTH_LEGACY_OWNER_EMAIL` | Opcional | E-mail válido e, em Production, presente na whitelist | Associação explícita de dados anteriores à autenticação |
| `SESSION_SECRET` | **Obrigatória** | Mínimo de 32 caracteres | Assinatura do state OAuth |
| `SESSION_TTL_DAYS` | Opcional | `90`; inteiro entre 1 e 365 | Expiração/renovação da sessão |
| `SESSION_COOKIE_NAME` | Opcional | `cofre_session` | Nome do cookie HTTP-only |

O cookie de sessão usa `HttpOnly`, `SameSite=Lax`, caminho `/` e `Secure` quando
`NODE_ENV=production`. Sessões válidas são renovadas quando entram na segunda
metade do TTL. Remover um e-mail da whitelist invalida seu uso na próxima
requisição autenticada.

### Google Sheets

| Variável | Production | Default/validação | Uso |
| --- | --- | --- | --- |
| `GOOGLE_SHEETS_CALLBACK_URL` | **Obrigatória** | URL válida | Callback da autorização incremental |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | **Obrigatória** | Base64 que decodifica para 32 bytes | AES-GCM dos refresh tokens |

Gere uma chave nova sem imprimi-la em logs ou documentação:

```bash
openssl rand -base64 32
```

O escopo efetivamente solicitado é
`https://www.googleapis.com/auth/drive.file`. Login e Sheets reutilizam o mesmo
Client ID/Secret, mas possuem callbacks diferentes.

## Frontend Production

| Variável | Obrigatoriedade | Uso |
| --- | --- | --- |
| `VITE_APP_MODE=production` | Recomendada explicitamente; é o fallback atual | Seleciona o cliente HTTP real |
| `VITE_API_URL=/api` | Recomendada; o fallback também é `/api` | Base centralizada das chamadas |

Usar `/api` é parte da estratégia first-party: a Vercel recebe a requisição e a
encaminha ao Render. Configurar diretamente o domínio Render muda o contexto de
cookie e pode quebrar a persistência no Safari.

## Frontend Demo

| Variável | Obrigatoriedade | Uso |
| --- | --- | --- |
| `VITE_APP_MODE=demo` | **Única variável esperada** | Seleciona adapter e fontes locais |
| `VITE_API_URL` | **Proibida** | O build falha se estiver definida |

A Demo não deve receber nenhuma variável Google, Turso ou secret do backend. O
arquivo `vercel.json` da raiz reforça o isolamento com `connect-src 'none'`.

## Coerência entre provedores

Em Production, quatro valores precisam descrever a mesma origem pública:

1. domínio do frontend Vercel;
2. item correspondente em `FRONTEND_URLS` no Render;
3. `GOOGLE_CALLBACK_URL` terminado em `/api/auth/google/callback`;
4. `GOOGLE_SHEETS_CALLBACK_URL` terminado em
   `/api/integrations/google-sheets/callback`.

Ambos os callbacks devem estar cadastrados literalmente como Authorized Redirect
URIs no cliente OAuth do Google. Alteração de domínio exige atualizar Google e
Render antes de validar o novo frontend.

