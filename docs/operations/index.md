# Operação do Cofre

Esta seção descreve como o Cofre é executado, configurado, publicado e
diagnosticado no estado atual do repositório. Ela é um runbook do projeto, não um
tutorial genérico dos provedores utilizados.

## Navegação

- [Desenvolvimento local](local-development.md)
- [Configuração e variáveis de ambiente](configuration.md)
- [Deploy e ambientes](deployment.md)
- [Diagnóstico e recuperação](runbook.md)

## Topologia operacional

| Ambiente | Frontend | Backend e banco | Integrações |
| --- | --- | --- | --- |
| Production | Vite/React na Vercel | Express no Render e libSQL remoto no Turso | Google OAuth e Google Drive/Sheets |
| Desenvolvimento completo | Vite dev server | Express e arquivo libSQL local por padrão | Google opcional, mas necessário para testar os fluxos reais |
| Public Demo | Build Vite independente na Vercel | Não existem | Simuladas como indisponíveis; dados ficam no `localStorage` |

Production e Demo usam o mesmo código-base, mas artefatos diferentes. O build
Demo troca o cliente HTTP por um adapter local, rejeita `VITE_API_URL`, audita o
bundle e recebe uma Content Security Policy com `connect-src 'none'`.

## Responsabilidades operacionais

- O processo backend valida o ambiente, conecta ao banco e aplica migrations
  pendentes antes de abrir a porta HTTP.
- O backend é a fonte canônica de dados de Production. A planilha não substitui
  o banco nem constitui mecanismo automático de restauração.
- A Vercel Production publica a SPA e encaminha `/api` ao Render, mantendo o
  cookie de sessão no mesmo site observado pelo navegador.
- A Demo não deve receber secrets nem URLs da infraestrutura pessoal.
- Logs são JSON no `stdout`/`stderr` e incluem `requestId`, rota, status e duração;
  não existe APM ou armazenamento de logs implementado pelo código.

## Documentação relacionada

- [Arquitetura](../architecture/index.md)
- [Banco e migrations](../database/index.md)
- [ADRs](../decisions/index.md)
- [API e Swagger](../api/index.md)
- [Estratégia de testes](../testing/index.md)

