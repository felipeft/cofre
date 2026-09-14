# Deploy e ambientes

## Production: backend no Render

Não existe `render.yaml`, Dockerfile ou outro manifesto de Render versionado. As
definições do serviço no painel não podem ser verificadas pelo repositório; os
valores abaixo são os compatíveis com os scripts atuais e devem ser conferidos no
serviço existente:

| Campo | Valor operacional |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Node.js 22.x |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

O start executa migrations automaticamente antes de abrir a porta. Como o
migrator não possui lock distribuído próprio, evite iniciar concorrentemente duas
revisões que possam aplicar a mesma migration nova.

Configure no Render todas as variáveis obrigatórias de Production descritas em
[Configuração](configuration.md). O filesystem da instância não é a persistência
de Production: dados e sessões usam o Turso.

Após o deploy, valide primeiro a API direta:

```bash
curl -i https://<backend-render>/health
curl -i https://<backend-render>/version
```

O primeiro acesso no plano gratuito pode aguardar a reativação do serviço.

## Production: frontend na Vercel

O projeto Production usa `frontend/` como Root Directory. O arquivo
`frontend/vercel.json`:

- encaminha `/api/:path*` ao backend Render;
- entrega `index.html` para as demais rotas da SPA.

Configuração compatível com o pacote:

| Campo | Valor operacional |
| --- | --- |
| Root Directory | `frontend` |
| Framework | Vite |
| Install Command | `npm ci` ou default detectado |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Variáveis do projeto:

```text
VITE_APP_MODE=production
VITE_API_URL=/api
```

O destino Render está escrito no rewrite versionado. Se o hostname da API mudar,
é necessário atualizar `frontend/vercel.json`, revisar `FRONTEND_URLS` e fazer
novo deploy. Depois valide a cadeia completa pelo domínio do frontend:

```bash
curl -i https://<frontend-production>/api/health
```

Por fim, faça smoke test manual de login, `/auth/me`, uma leitura autenticada e
logout. Isso comprova proxy, callback e cookie, não apenas disponibilidade da SPA.

## Public Demo na Vercel

A Demo é outro projeto Vercel apontando para o mesmo repositório, com Root
Directory na raiz (`./`). O `vercel.json` da raiz define integralmente:

- instalação: `cd frontend && npm ci`;
- build: `cd frontend && npm run build:demo`;
- saída: `frontend/dist`;
- fallback da SPA;
- CSP sem conexões externas.

Configure somente:

```text
VITE_APP_MODE=demo
```

Não configure `VITE_API_URL` nem copie variáveis do Render. O próprio build deve
falhar se detectar uma URL de API, host privado conhecido ou padrão de secret no
artefato.

Smoke test da Demo:

1. abrir sem tela de login;
2. criar e editar uma movimentação;
3. recarregar e confirmar persistência local;
4. verificar que Google Sheets aparece como integração indisponível;
5. usar “Resetar demonstração” e confirmar retorno do seed;
6. confirmar no Network do navegador que não existem chamadas externas.

## Ordem segura de publicação

1. Execute testes e builds aplicáveis.
2. Garanta backup/recuperação do banco antes de uma migration de risco.
3. Publique o backend e confirme migrations nos logs.
4. Valide `/health` diretamente no Render.
5. Publique o frontend Production e valide `/api/health` pela Vercel.
6. Faça smoke test de OAuth, sessão e Sheets quando essas áreas mudarem.
7. Publique a Demo separadamente e execute seu smoke test.

Rollback do frontend não reverte schema. Rollback do backend após uma migration
também pode ser incompatível com o banco já evoluído; confira compatibilidade
antes de selecionar uma revisão antiga no provedor.

## Ausências operacionais atuais

- configuração do Render não está declarada como código;
- não há workflow de CI/CD no repositório;
- não há containerização;
- não há script versionado de backup/restore do Turso;
- não há deploy automático ou smoke test descrito pelo código;
- sincronização Google Sheets é manual, não agendada.

Essas ausências são limites atuais, não instruções para improvisar procedimentos
fora do controle de versão.

