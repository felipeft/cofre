# C4 Nível 2 — Containers

## Containers lógicos

| Container | Responsabilidade | Comunicação |
| --- | --- | --- |
| Frontend Production | SPA responsiva, coordenação de estado e apresentação dos dados reais. | HTTPS/JSON com a API por `/api`, incluindo cookie de sessão. |
| Backend API | Autenticação, autorização, validação, casos de uso, regras financeiras e Google Sheets. | Express HTTP, libSQL e APIs Google. |
| Banco de dados principal | Fonte persistente para usuários, sessões, finanças, integração e histórico de sincronização. | Acessado exclusivamente pelo backend com `@libsql/client`. |
| Frontend Public Demo | Build isolado da mesma UI, executado com identidade e dados sintéticos. | Contrato local compatível com os services do frontend. |
| Armazenamento da Demo | Estado persistente da demonstração no navegador. | `localStorage`, chave única `cofre:demo:v1`. |

Sessões não formam um container separado: são registros persistidos no banco principal. Da mesma forma, o seed da Demo é parte do bundle e não um serviço externo.

## Relações essenciais

```text
Production: Usuário → Frontend → API → Banco
                                  ├── Google Identity
                                  └── Google Drive/Sheets

Demo:       Visitante → Frontend Demo → Demo adapter → localStorage
```

## Arquitetura lógica versus deployment

A view C4 `Containers` descreve responsabilidades, independentemente de hospedagem. As views de deployment mapeiam essas unidades para a infraestrutura atual:

| Ambiente | Mapeamento atual |
| --- | --- |
| Production | Frontend na Vercel; API no Render; banco remoto no Turso. |
| Desenvolvimento | Frontend e API em processos locais; arquivo libSQL/SQLite local. |
| Public Demo | Build Demo na Vercel; dados persistidos no navegador do visitante. |

O `frontend/vercel.json` mantém `/api` no mesmo site visível ao navegador e encaminha as requisições ao Render. Essa decisão permite cookie `SameSite=Lax` first-party no uso pelo Safari. O `vercel.json` da raiz constrói somente a Demo e adiciona uma Content Security Policy com `connect-src 'none'`.

As views canônicas são `Containers`, `ProductionDeployment` e `DemoDeployment` em [`workspace.dsl`](structurizr/workspace.dsl).
