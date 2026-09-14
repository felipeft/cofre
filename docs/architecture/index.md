# Arquitetura do Cofre

Esta seção descreve a arquitetura implementada do Cofre usando o C4 Model. O arquivo [`structurizr/workspace.dsl`](structurizr/workspace.dsl) é a fonte de verdade dos elementos, relacionamentos e views C4; os diagramas Mermaid documentam apenas fluxos dinâmicos complementares.

As motivações e trade-offs das escolhas estruturais estão registrados nos [Architecture Decision Records](../decisions/index.md).

## Navegação

- [C4 Nível 1 — System Context](system-context.md)
- [C4 Nível 2 — Containers e deployment](containers.md)
- [C4 Nível 3 — Frontend](frontend.md)
- [C4 Nível 3 — Backend](backend.md)
- [Banco de dados na arquitetura](database.md)
- [Integrações externas e fluxos](integrations.md)
- [Fonte Structurizr DSL](structurizr/workspace.dsl)

## Escopo e convenções

A documentação separa três perspectivas:

1. **Arquitetura lógica:** responsabilidades e dependências do sistema, independentemente do provedor de hospedagem.
2. **Deployment:** onde cada container é publicado ou persistido hoje.
3. **Fluxos dinâmicos:** ordem das interações em OAuth e sincronização.

No C4, um *container* é uma unidade executável ou um data store, não um container Docker. Vercel, Render e Turso são nós de deployment; Google Identity e Google Drive/Sheets são sistemas externos.

## Views mantidas no workspace

| View | Nível | Objetivo |
| --- | --- | --- |
| `SystemContext` | C4 L1 | Atores, Cofre e sistemas externos |
| `Containers` | C4 L2 | Aplicações e data stores dos dois ambientes |
| `FrontendComponents` | C4 L3 | Estrutura relevante do frontend Production |
| `BackendComponents` | C4 L3 | Borda HTTP, aplicação, domínio, persistência e Google |
| `DemoComponents` | C4 L3 | Adapter, regras locais e seed da Demo |
| `ProductionDeployment` | Deployment | Vercel, Render e Turso |
| `DemoDeployment` | Deployment | Vercel Demo e armazenamento no navegador |

Detalhes de classes, funções, endpoints e tabelas não são reproduzidos no modelo C4. Eles pertencem às documentações específicas das próximas etapas.
