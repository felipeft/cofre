# Isolamento e invariantes transversais

## Usuário como fronteira dos dados

**Regra de domínio.** Categorias, transações, cartões, pagamentos, definições recorrentes, preferências e integração Google pertencem a um usuário. Um identificador de recurso sozinho nunca autoriza acesso.

O proprietário é obtido da sessão autenticada. Operações não aceitam um `userId` arbitrário do frontend para decidir de quem são os dados.

```text
recurso acessível = id do recurso + id do usuário autenticado
```

**Por que existe.** IDs numéricos podem ser observados ou adivinhados. Sem combinar ID e proprietário, trocar o número numa URL permitiria ler ou modificar dados financeiros alheios.

## Defesa em camadas

**Decisão de aplicação.** Rotas financeiras exigem sessão válida e proteção contra requisições cross-site mutáveis.

**Detalhe técnico atual.** O isolamento é reforçado em três pontos:

1. services recebem o usuário da sessão, não do payload;
2. repositories filtram leituras, alterações e exclusões por `user_id`;
3. triggers do banco recusam relações entre proprietários diferentes em transações, recorrências e pagamentos de cartão.

Assim, uma transação do usuário A não pode referenciar categoria, cartão ou recorrência do usuário B, mesmo se um erro de aplicação tentar gravar essa combinação.

## Unicidade no escopo correto

Nomes de categorias e cartões não são globais:

- categoria: única por `usuário + tipo + nome`, sem diferença de caixa;
- cartão: único por `usuário + nome`, sem diferença de caixa.

Dois usuários podem criar estruturas com nomes idênticos. Essa regra evita colisões artificiais entre contas e mantém a experiência de cada pessoa independente.

A idempotência recorrente e a da sincronização também são contextualizadas: ocorrência por definição/competência e chave ou fingerprint por usuário.

## Integridade histórica

**Regra de domínio.** Relações necessárias não podem ser removidas enquanto ainda dão significado a fatos ou regras:

- categoria usada bloqueia exclusão;
- cartão usado por transação, pagamento ou recorrência bloqueia exclusão;
- exclusão da recorrência exige decidir o destino das ocorrências.

**Decisão de aplicação.** Inativação é usada para impedir novos usos sem destruir vínculos existentes. Ela não substitui uma exclusão solicitada pelo usuário.

## Valores monetários

**Regra de domínio.** Entradas financeiras devem ser positivas. Receitas e despesas são separadas pelo tipo, e cálculos que dividem valores arredondam em centavos preservando o total.

**Detalhe técnico atual.** Valores são persistidos como `REAL` e normalizados para duas casas nas funções de cálculo sensíveis, como parcelamento e limite. Não há conversão cambial nem ajuste monetário temporal.

## Datas

Datas financeiras são tratadas como datas civis `YYYY-MM-DD`, sem horário. Competência é armazenada como mês e ano, permitindo consultas independentes do dia.

**Débito atual.** O schema de transações garante formato, mas não rejeita todas as datas civis impossíveis; recorrências validam a existência do dia no calendário. O horizonte “mês atual” da geração recorrente também deriva do relógio do processo backend.

## Invariantes verificadas e lacunas

| Regra | Garantia atual |
| --- | --- |
| Valor positivo | Validação de entrada e constraint do banco |
| Categoria compatível na criação/edição da transação | Service |
| Recursos relacionados do mesmo usuário | Service/repository e triggers |
| Parcelas completas ou nenhuma | Transação de banco |
| Uma ocorrência por competência | Índice único e inserção idempotente |
| Exclusões em massa restritas ao usuário | Filtros e testes com dois usuários |
| Alterar tipo de categoria já usada | Não há bloqueio/revalidação retroativa |
| Alterar somente o tipo de transação com cartão existente | O vínculo não é revalidado sem `cardId` no mesmo patch |
| Transições de status | Valores são restritos, transições não |

As três últimas linhas descrevem lacunas reais encontradas na auditoria, não regras desejadas.

## Production e Demo

Production aplica a fronteira multiusuário com sessão, API e banco. A Demo possui uma única identidade fictícia e armazena o estado no namespace `cofre:demo:v1` do navegador; seu isolamento principal é em relação à infraestrutura real, não entre múltiplos visitantes.

A Demo reproduz as regras centrais de CRUD, parcelamento, recorrência e limite para apresentação. Há uma divergência conhecida no modo “preservar histórico” da recorrência: o backend mantém o indicador descritivo `isRecurring`, enquanto o adapter Demo o desmarca ao desvincular a ocorrência. Integrações externas permanecem bloqueadas por construção no build Demo.
