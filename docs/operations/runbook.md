# Diagnóstico e recuperação

## Endpoints públicos de diagnóstico

| Endpoint | Conteúdo | Uso |
| --- | --- | --- |
| `GET /` | Nome, versão e ambiente | Identificar a API |
| `GET /health` | Banco, uptime e timestamp | Health check principal |
| `GET /version` | Versão, Node e ambiente | Conferir runtime/revisão lógica |
| `GET /status` | Processo, memória e provider do banco | Diagnóstico leve do processo |
| `GET /openapi.json` | Contrato OpenAPI 3.1 | Inspeção/automação |
| `GET /api-docs` | Swagger UI | Exploração manual da API |

No acesso direto ao Render use os caminhos acima. Pelo frontend Vercel
Production, prefixe com `/api`, por exemplo `/api/health`.

Cada resposta inclui `X-Request-Id`. Os logs JSON do backend usam esse ID para
correlacionar duração, status e erro. `/status` e os demais endpoints listados são
públicos no roteamento atual; não publique neles novos dados sensíveis.

### Limite conhecido do health check

`/health` executa `SELECT 1`. Em sucesso retorna `200` com `status: ok`. Embora o
controller preveja `503` para `degraded`, o repository atual lança uma exceção se
a consulta falhar; na prática, uma indisponibilidade do banco tende a ser tratada
como erro HTTP pelo middleware global. Não dependa exclusivamente do corpo
`degraded`: observe status HTTP e logs.

## Matriz rápida

| Sintoma | Diagnóstico inicial | Recuperação segura |
| --- | --- | --- |
| Frontend abre, mas dados não carregam | Testar `/api/health`, depois a API Render direta | Aguardar cold start; revisar deploy/logs sem alterar dados |
| API não inicia | Ler primeiro erro de ambiente, banco ou migration no log | Corrigir configuração ou migration pendente; redeploy controlado |
| `NETWORK_ERROR` no frontend | Comparar Vercel `/api/health` com Render `/health` | Corrigir disponibilidade ou rewrite; não limpar banco/browser |
| CORS `403` | Conferir `Origin` e `FRONTEND_URLS` | Adicionar a origem exata e reiniciar backend |
| `auth_error=failed` | Correlacionar callback com log/request ID | Conferir credenciais, callback, proxy e URI no Google |
| `auth_error=not_allowed` | Conferir e-mail normalizado na whitelist | Atualizar `AUTH_ALLOWED_EMAILS` somente se o acesso for autorizado |
| Sessão não persiste | Conferir caminho Vercel `/api`, `NODE_ENV` e cookie | Restaurar proxy first-party e config; evitar API Render direta no browser |
| Sheets pede reconexão | Consultar estado da integração e código seguro do erro | Refazer autorização com a mesma conta Google |
| Sincronização fica `running` | Consultar status/histórico e logs | Após 15 minutos, a próxima consulta marca a execução interrompida como falha |
| Demo tenta acessar backend ou build falha | Conferir variáveis do projeto Demo | Remover `VITE_API_URL` e qualquer variável privada; novo build |

## Backend ou banco indisponível

1. Teste `https://<frontend>/api/health`.
2. Teste `https://<backend-render>/health` diretamente.
3. Se apenas o primeiro falhar, revise o rewrite da Vercel.
4. Se ambos falharem, consulte o evento de deploy e logs do Render.
5. Localize mensagens `Falha ao iniciar o servidor`, `request_error` ou erro de
   conexão/migration.
6. Confirme no painel do Turso que URL/token ainda correspondem ao banco correto e
   que o serviço está disponível; não imprima o token.

Reiniciar pode recuperar uma falha transitória, mas não corrige credencial ou SQL
inválido. Não troque para arquivo local no Render como contingência: isso criaria
uma segunda fonte não persistente e divergente.

## Migration com falha

O backend não abre a porta se uma migration falhar. Cada migration pendente é
transacional e só entra em `schema_migrations` após seu SQL terminar.

Diagnóstico seguro:

1. identifique no log o primeiro arquivo que falhou;
2. consulte `schema_migrations` e confirme se ele foi registrado;
3. execute `foreign_key_check` em uma cópia/ambiente controlado quando houver
   suspeita de integridade;
4. confirme se outra instância tentou migrar simultaneamente;
5. preserve snapshot/backup antes de qualquer intervenção.

Não apague linhas de `schema_migrations`, não marque arquivos manualmente como
aplicados e não edite uma migration já executada. Se o arquivo falhou e nunca foi
aplicado em ambiente algum, corrija-o somente após comprovar esse estado. Se já
foi aplicado em algum ambiente, produza uma migration forward-only compatível.

Restaurar snapshot é ação potencialmente destrutiva: exige confirmar ponto de
restauração, janela de indisponibilidade e quais gravações posteriores seriam
perdidas. O repositório não fornece automação de backup/restore.

## CORS, OAuth e cookies

### CORS

O backend aceita chamadas sem `Origin` para ferramentas e health checks. No
navegador, a origem deve constar exatamente em `FRONTEND_URLS`; credenciais CORS
são habilitadas. Para métodos mutáveis, o middleware também rejeita uma origem
presente que não esteja na lista.

Verificação controlada:

```bash
curl -i -H "Origin: https://<frontend-production>" https://<backend-render>/health
```

### Google OAuth

Verifique em conjunto:

- Client ID e Secret no Render;
- callback do login no Render e no Google Cloud;
- callback apontando para o domínio Vercel e contendo `/api`;
- e-mail na whitelist;
- logs do callback, que registram código interno e erro do provider sem devolver
  secrets ao frontend;
- relógio do ambiente, pois state, nonce e tokens expiram.

Não envie Client Secret ao frontend. Não use a URL direta do Render como base do
cliente apenas para contornar cookie: o desenho atual depende do proxy Vercel.

## Google Sheets e sincronização

Falhas do cliente externo são normalizadas, entre outras, como:

- `GOOGLE_API_UNAVAILABLE`: timeout/rede; tente novamente depois de confirmar a
  disponibilidade;
- `GOOGLE_RATE_LIMITED`: aguarde antes de repetir;
- `GOOGLE_TOKEN_REVOKED` ou `GOOGLE_AUTHORIZATION_FAILED`: reconecte a integração;
- `GOOGLE_SHEET_NOT_FOUND`: confirme no Drive se o arquivo foi apagado;
- `GOOGLE_REFRESH_TOKEN_MISSING`: revogue o acesso do Cofre na conta Google e
  autorize novamente para obter acesso persistente;
- `GOOGLE_ACCOUNT_MISMATCH`: use a mesma identidade do login do Cofre.

Antes de repetir uma sincronização, abra a Central de Sincronização e consulte a
última execução. Cada clique usa uma chave idempotente; repetir a mesma chave não
deve duplicar a operação. Execuções simultâneas do mesmo usuário são bloqueadas,
e runs `running` há pelo menos 15 minutos são marcadas como `SYNC_INTERRUPTED` na
próxima consulta/início.

Conflitos ou linhas inválidas devem ser corrigidos na planilha e então
sincronizados novamente. Não importe SQL manualmente. Quando exclusões locais
marcam `requires_full_export`, o serviço exporta o estado canônico antes de ler a
planilha para evitar ressurreição de dados.

Desconectar remove a credencial local e tenta revogar o token, mas preserva a
planilha no Drive. Se o arquivo realmente foi removido, o estado `file_missing`
permite criar outra planilha gerenciada pela interface.

## Falha de deploy

- **Render:** verifique instalação, Node 22, variáveis e logs do bootstrap. Um
  deploy marcado como ativo não garante banco/migrations se `/health` falha.
- **Vercel Production:** confirme Root Directory `frontend`, build Vite, rewrite e
  variáveis Production.
- **Vercel Demo:** confirme Root Directory `./`; escolher `frontend` ignora o
  `vercel.json` raiz que contém build e CSP específicos da Demo.

Prefira voltar ao último artefato de frontend conhecido quando a falha for apenas
estática. Para backend, avalie primeiro se houve migration: fazer rollback do
código sem rollback do schema pode aumentar a indisponibilidade.

## Operações destrutivas não são recuperação

“Limpar todos os registros financeiros” e “Resetar completamente o Cofre” são
funções user-scoped da aplicação, com prévia e confirmação explícita. Elas não
reparam migrations, conexão, OAuth ou sincronização e não devem ser usadas como
tentativa de recuperação operacional.

No banco de Production, não execute `DROP`, `DELETE` amplo, limpeza de
`schema_migrations` ou restauração sem backup verificado e decisão explícita sobre
perda de dados. A documentação do [ciclo de dados](../domain/data-lifecycle.md)
descreve as exclusões suportadas pelo produto.

## Problemas conhecidos

- o health check não materializa de forma confiável o estado `degraded` quando o
  repository de banco lança erro;
- não há lock distribuído explícito para migrations;
- não há retries gerais para inicialização do banco;
- logs ficam sob responsabilidade do `stdout`/`stderr` do provedor; não há APM;
- não há backup/restore, CI/CD ou configuração Render versionados;
- validação real de Safari, Google e Turso permanece manual;
- sincronização Sheets é manual;
- o plano gratuito do Render pode introduzir latência no primeiro acesso;
- os builds Production e Demo passam, mas o Vite alerta que o chunk JavaScript
  principal supera 500 kB após minificação;
- o lint passa sem erro, porém mantém avisos de Fast Refresh em arquivos que
  exportam contextos/helpers e de variáveis não usadas nos mocks antigos.
