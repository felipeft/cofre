# Architecture Decision Records

Esta seção registra decisões arquiteturais vigentes do Cofre. Os ADRs explicam o contexto, o problema, a escolha e seus trade-offs; a descrição estrutural permanece em [`docs/architecture/`](../architecture/index.md), e as regras financeiras em [`docs/domain/`](../domain/index.md).

## Convenções

- **Accepted:** decisão vigente e refletida no código atual.
- **Superseded:** decisão histórica substituída por outro ADR.
- **Deprecated:** decisão ainda registrada, mas cujo uso foi abandonado sem substituição direta.

As alternativas foram reconstruídas a partir das restrições e fronteiras observáveis no projeto. Elas representam opções arquiteturalmente plausíveis avaliadas contra o estado atual; não afirmam que houve protótipo ou discussão histórica quando o repositório não preserva essa evidência.

## Índice

| Número | Decisão | Status | Resumo |
| --- | --- | --- | --- |
| [ADR-0001](0001-persistencia-libsql-e-turso.md) | Persistência relacional SQLite-compatible com libSQL e Turso | Accepted | Uma fachada assíncrona atende arquivo local e banco remoto, com migrations forward-only. |
| [ADR-0002](0002-banco-como-fonte-canonica.md) | Banco da aplicação como fonte canônica | Accepted | Google Sheets é uma projeção secundária com importação controlada, não uma réplica equivalente. |
| [ADR-0003](0003-parcelamentos-como-transacoes-agrupadas.md) | Parcelamentos como transações agrupadas | Accepted | Cada parcela é um fato financeiro próprio e o grupo identifica a compra original. |
| [ADR-0004](0004-recorrencias-com-ocorrencias-materializadas.md) | Recorrências com definição e ocorrências separadas | Accepted | Regras mensais materializam transações idempotentes sob demanda e avançam por checkpoint. |
| [ADR-0005](0005-hard-delete-e-preservacao-historica.md) | Hard delete com preservação histórica explícita | Accepted | Exclusões removem dados de verdade, bloqueiam vínculos e oferecem preservação somente quando há semântica definida. |
| [ADR-0006](0006-google-oauth-e-sessoes-no-backend.md) | Google OAuth e sessões persistentes no backend | Accepted | O backend valida a identidade, aplica whitelist e mantém sessão opaca em cookie HTTP-only. |
| [ADR-0007](0007-isolamento-multiusuario-por-user-id.md) | Isolamento multiusuário por `user_id` | Accepted | Sessão, queries, constraints e triggers formam uma defesa em camadas contra acesso cruzado. |
| [ADR-0008](0008-sincronizacao-manual-idempotente.md) | Sincronização manual idempotente com Google Sheets | Accepted | Preview, fingerprint, chave idempotente, exclusão mútua e exportação prioritária evitam duplicação e ressurreição. |
| [ADR-0009](0009-builds-isolados-production-e-demo.md) | Builds isolados para Production e Demo | Accepted | O mesmo frontend escolhe no build entre API real e adapter local, sem disponibilizar infraestrutura privada à Demo. |

## Decisões históricas não formalizadas

A sequência de migrations comprova que o Cofre evoluiu de tabelas globais para ownership por usuário e que funcionalidades antigas foram removidas. Entretanto, o repositório não preserva contexto, alternativas e consequências suficientes para transformar os estados anteriores em ADRs históricos confiáveis.

Por isso, esta coleção não cria artificialmente ADRs `Superseded`. Em particular, a antiga regra de dízimos/ofertas é apenas evolução de domínio registrada nas migrations `0003`, `0004`, `0010` e removida pela `0014`; ela não é apresentada como decisão arquitetural atual.
