# Documentação técnica do Cofre

O Cofre é uma aplicação de controle financeiro pessoal com histórico,
parcelamentos, cartões, gastos recorrentes, autenticação Google e sincronização
manual com Google Sheets. Esta documentação descreve o sistema que está
implementado hoje, suas decisões e seus limites operacionais.

[Experimentar a Live Demo](https://cofre-demo.vercel.app/){ .md-button .md-button--primary }
[Ver o repositório](https://github.com/felipeft/cofre){ .md-button }

## Como a documentação está organizada

| Área | Conteúdo |
| --- | --- |
| [Primeiros passos](operations/local-development.md) | Preparação do ambiente, execução local e comandos de validação |
| [Arquitetura](architecture/index.md) | Modelo C4, containers, componentes, deployment e integrações |
| [Domínio](domain/index.md) | Regras financeiras, invariantes, histórico e ciclo de vida dos dados |
| [ADRs](decisions/index.md) | Contexto, alternativas e consequências das decisões arquiteturais |
| [API](api/index.md) | Contrato OpenAPI 3.1, autenticação, Swagger UI e cobertura das rotas |
| [Banco de dados](database/index.md) | Modelo relacional, constraints, índices, migrations e integridade |
| [Testes](testing/index.md) | Estratégia, rastreabilidade, execução e lacunas da cobertura |
| [Operações](operations/index.md) | Configuração, deploy, diagnóstico e recuperação segura |

## Dois ambientes

### Production

A aplicação pessoal usa frontend na Vercel, API Express no Render, persistência
Turso/libSQL, Google OAuth e integração com Google Drive/Sheets. O banco da
aplicação é a fonte canônica dos dados.

### Public Demo / Sandbox

A [Demo pública](https://cofre-demo.vercel.app/) é um deployment separado do
mesmo repositório. Ela entra com identidade fictícia, usa dados sintéticos e
persiste somente no `localStorage` do visitante. O artefato não possui cliente de
produção, credenciais ou acesso ao backend, Turso e APIs Google.

## Percursos recomendados

- **Primeiro contato:** [Arquitetura](architecture/index.md) →
  [Domínio](domain/index.md) → [Live Demo](https://cofre-demo.vercel.app/).
- **Desenvolvimento:** [Ambiente local](operations/local-development.md) →
  [Configuração](operations/configuration.md) → [Testes](testing/index.md).
- **Operação:** [Deploy](operations/deployment.md) →
  [Runbook](operations/runbook.md) → [Banco](database/index.md).
- **Contrato HTTP:** [OpenAPI e Swagger](api/index.md). Com a API local ativa,
  use `http://localhost:3000/api-docs` para a interface navegável.

!!! note "Fonte de verdade"

    Código, migrations e testes prevalecem quando houver divergência. A
    documentação arquitetural e de domínio registra explicitamente dívidas e
    garantias que pertencem apenas à aplicação, em vez de atribuí-las ao banco.

