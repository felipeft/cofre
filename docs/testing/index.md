# Testes

Esta seção descreve a estratégia de testes que existe hoje no Cofre. O inventário
foi reconstruído a partir dos scripts dos pacotes e dos arquivos de teste; ele não
representa uma meta futura de cobertura.

## Navegação

- [Estratégia e execução](strategy.md)
- [Matriz de rastreabilidade](traceability.md)

## Estado atual da suíte

| Escopo | Executor | Arquivos | Cenários declarados | Papel principal |
| --- | --- | ---: | ---: | --- |
| Backend | `node:test` + `node:assert/strict` | 15 | 97 | Domínio, services/repositories, banco, autenticação HTTP, migrations e contrato OpenAPI |
| Demo | `node:test` + `node:assert/strict` | 1 | 7 | Adapter client-side, regras financeiras locais, isolamento do storage e bloqueio de integrações |
| **Total automatizado** |  | **16** | **104** |  |

Os números acima correspondem à execução completa validada em **14/09/2026**. O
backend reporta os 97 casos individualmente. No pacote ESM do frontend, o comando
oficial agrega o arquivo da Demo como um teste de arquivo aprovado, embora ele
declare e execute sete casos com `node:test`; por isso o inventário usa “cenários
declarados”, não a soma literal das duas linhas `# tests` dos runners. Não há
instrumento de cobertura por linhas/branches nem limite mínimo configurado.

## Leitura correta dos resultados

- **Coberto automaticamente:** existe uma asserção que exercita diretamente o
  comportamento descrito.
- **Parcialmente coberto:** parte do fluxo ou uma camada inferior é testada, mas
  falta comprovar o comportamento completo pela fronteira pública relevante.
- **Sustentado apenas por código:** a auditoria encontrou a implementação, mas
  nenhum teste automatizado direto.
- **Lacuna:** não existe proteção automatizada suficiente para afirmar o
  comportamento ou detectar sua regressão.

Um teste de integração neste projeto normalmente usa a base libSQL local e chama
services/repositories reais. Isso não significa necessariamente que a rota HTTP
correspondente foi exercitada. A principal exceção é a suíte de autenticação, que
inicia o Express e faz requisições HTTP reais contra uma porta local.

## Documentos relacionados

- [Regras de domínio](../domain/index.md)
- [Arquitetura](../architecture/index.md)
- [Modelo e integridade do banco](../database/index.md)
- [Contrato OpenAPI](../api/index.md)
- [Decisões arquiteturais](../decisions/index.md)
