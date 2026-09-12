# COFRE — Regras de domínio

## Categorias

- Categoria possui tipo `income` ou `expense`, nome, cor, ícone, atividade e ordenação.
- O nome é único, sem diferença entre maiúsculas e minúsculas, por usuário e tipo.
- A categoria de uma transação deve existir, pertencer ao usuário autenticado e ter o mesmo tipo da movimentação.
- A exclusão é física e recusada quando existem transações ou recorrências vinculadas.

## Transações e resumo

- Valores são positivos; data, tipo e categoria são obrigatórios.
- A competência pode ser informada ou derivada da data.
- Status aceitos: `pending`, `confirmed` e `cancelled`.
- A exclusão de transações é física.
- O saldo financeiro é `receitas − despesas`.
- Transações históricas não são reescritas quando uma categoria ou definição recorrente muda.

## Cartões

- Cartões pertencem ao usuário, possuem limite, fechamento, vencimento e estado de atividade.
- Somente despesas podem usar cartão.
- Compras não canceladas comprometem o limite uma vez.
- Pagamentos de fatura liberam limite e não criam uma segunda despesa.
- Excluir uma transação de cartão remove sua contribuição do limite.

## Parcelamentos

- Uma compra parcelada gera exatamente N transações, sem linha extra para o total original.
- As parcelas compartilham `installment_group_id` e são gravadas atomicamente.
- O ajuste de centavos fica na última parcela para preservar a soma exata.

## Gastos recorrentes

- A definição recorrente é separada das ocorrências, que são transações normais.
- A unicidade por recorrência e competência torna a geração idempotente.
- Alterar a definição não reescreve ocorrências já materializadas.
- Excluir a definição pode preservar as ocorrências, desvinculando-as, ou
  removê-las na mesma transação, conforme a confirmação do usuário.
- A reconciliação avança por checkpoint mensal e nunca recria uma ocorrência
  individual que o usuário excluiu de uma competência já processada.

## Autenticação e propriedade

- Dados privados são sempre filtrados pelo usuário da sessão.
- IDs enviados pelo cliente nunca determinam o proprietário.
- Sessões são persistidas no banco e representadas por cookie HTTP-only.
- Preferências visuais são individuais e persistidas em `user_settings`.
