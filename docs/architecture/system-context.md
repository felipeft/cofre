# C4 Nível 1 — System Context

O Cofre atende dois perfis com limites arquiteturais diferentes.

| Ator | Uso |
| --- | --- |
| Usuário autorizado | Autentica-se pelo Google e gerencia dados financeiros privados no ambiente Production. |
| Visitante da Demo | Explora uma cópia funcional com identidade e dados sintéticos, sem alcançar a infraestrutura privada. |

## Sistema em foco

O **Cofre** registra e analisa receitas e despesas, administra categorias, cartões, parcelas, pagamentos de fatura e gastos recorrentes, mantém configurações por usuário e, quando autorizado, sincroniza uma planilha Google.

## Sistemas externos

| Sistema | Relacionamento real |
| --- | --- |
| Google Identity | Autenticação OAuth/OIDC, obtenção e validação da identidade estável do usuário. |
| Google Drive e Sheets | Criação e manipulação somente da planilha autorizada pelo escopo `drive.file`. |

Vercel, Render e Turso não aparecem como sistemas externos no contexto lógico: eles hospedam containers do Cofre e são mostrados nas views de deployment. A Demo não se relaciona com os sistemas Google.

## Fronteiras de confiança

- O frontend Production não recebe Client Secret, token de sessão ou refresh token.
- A API valida a identidade Google, a whitelist e a sessão persistida antes de liberar rotas privadas.
- O usuário é derivado da sessão; endpoints de negócio não aceitam `userId` para determinar ownership.
- O refresh token do Sheets, quando existente, é criptografado antes de ser persistido.
- A Demo não possui cliente HTTP de produção no bundle e não utiliza OAuth, cookies, Turso ou Google APIs.

A view canônica correspondente é `SystemContext` em [`workspace.dsl`](structurizr/workspace.dsl).
