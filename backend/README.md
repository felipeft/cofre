# Cofre API

API do sistema financeiro Cofre, construída com Node.js, Express e
libSQL/Turso. O backend é a fonte de verdade para autenticação, propriedade
dos dados, validações, cálculos financeiros e sincronização com Google Sheets.

## Execução

```bash
cp .env.example .env
npm install
npm run dev
```

Em produção, configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Em
desenvolvimento, a aplicação pode usar um arquivo libSQL local. O bootstrap
executa automaticamente todas as migrations pendentes.

## Scripts

```bash
npm run dev
npm run start
npm run migrate
npm test
```

## Arquitetura

```text
Routes → Auth/Validation → Controllers → Services → Domain/Repositories → libSQL/Turso
                                                ↓
                                              Mappers
```

- Controllers tratam a borda HTTP.
- Services orquestram regras, propriedade e persistência.
- Domain contém cálculos puros.
- Repositories concentram SQL parametrizado.
- Mappers convertem o formato do banco para o contrato da API.
- Schemas Zod validam entradas e impedem mass assignment.

## Autenticação e segurança

- OAuth Google com validação de `state`, nonce e PKCE.
- Whitelist configurada por ambiente.
- Sessões persistidas no banco e cookie HTTP-only.
- Rotas privadas usam exclusivamente o usuário obtido da sessão.
- Queries combinam `user_id` e o id do recurso para impedir IDOR.
- Tokens persistentes do Google Sheets são criptografados.

O proxy `/api` da Vercel mantém o cookie no mesmo site do frontend, tornando
a sessão adequada ao uso diário pelo Safari no iPhone.

## Entidades

- `users`: identidade Google e nome externo.
- `user_settings`: preferência visual individual.
- `sessions`: sessões autenticadas persistentes.
- `categories`: categorias de receita e despesa.
- `transactions`: receitas, despesas, parcelas e ocorrências materializadas.
- `credit_cards`: cartões e dados do ciclo de fatura.
- `credit_card_payments`: pagamentos que liberam limite sem duplicar despesas.
- `recurring_expenses`: definições mensais de gastos recorrentes.
- tabelas `google_sheets_*`: autorização, integração, importações e histórico de sincronização.

## Regras financeiras atuais

O resumo de uma competência retorna:

```json
{
  "totalIncome": 7000,
  "totalExpenses": 300,
  "balance": 6700
}
```

O saldo é calculado exclusivamente como `receitas − despesas`. Destinações
pessoais de renda são representadas como despesas comuns na categoria
escolhida pelo usuário.

Compras de cartão já são despesas. O pagamento da fatura apenas reduz o
limite utilizado e não cria uma segunda movimentação.

## Rotas principais

Todas as rotas abaixo, exceto infraestrutura e início/callback de login,
exigem sessão válida.

| Método e rota | Finalidade |
|---|---|
| `GET /auth/google` | Inicia o login Google |
| `GET /auth/google/callback` | Conclui o OAuth |
| `GET /auth/me` | Consulta usuário e sessão atuais |
| `POST /auth/logout` | Invalida a sessão |
| `GET/PATCH /profile` | Consulta ou atualiza o nome de exibição |
| `GET/PATCH /settings` | Consulta ou atualiza o tema |
| `GET/POST /categories` | Lista ou cria categorias |
| `GET/PUT/DELETE /categories/:id` | Opera uma categoria do usuário |
| `GET /categories/:id/deletion-preview` | Informa vínculos que impedem excluir a categoria |
| `GET/POST /transactions` | Lista ou cria movimentações |
| `GET /transactions/summary` | Resumo mensal |
| `GET/PUT/DELETE /transactions/:id` | Opera uma movimentação do usuário |
| `GET /transactions/:id/deletion-preview` | Informa impacto da exclusão definitiva |
| `GET/POST /cards` | Lista ou cria cartões |
| `GET /cards/:id/summary` | Compras, pagamentos e limite |
| `POST /cards/:id/payments` | Registra pagamento de fatura |
| `PUT/DELETE /cards/:id` | Atualiza ou exclui cartão |
| `GET /cards/:id/deletion-preview` | Informa transações, recorrências e pagamentos vinculados |
| `GET/POST /recurring-expenses` | Lista ou cria definições recorrentes |
| `GET/PUT/DELETE /recurring-expenses/:id` | Opera uma definição recorrente |
| `GET /recurring-expenses/:id/deletion-preview` | Informa o histórico associado à recorrência |
| `GET /data-management/preview` | Prévia de limpeza ou reset da conta atual |
| `POST /data-management/clear-records` | Remove todos os registros financeiros |
| `POST /data-management/reset` | Reseta toda a estrutura financeira do usuário |
| `/integrations/google-sheets/*` | Conexão, planilha, importação e exportação |

A especificação completa e executável está disponível em:

- `GET /api-docs` — Swagger UI navegável;
- `GET /openapi.json` — documento OpenAPI 3.1 em JSON.

Os schemas de entrada são gerados dos mesmos schemas Zod executados pelos
middlewares. Os schemas de saída ficam centralizados no módulo OpenAPI porque
as respostas atuais são produzidas por mappers e services, sem schemas Zod de
saída. Para validar sintaxe e cobertura das rotas:

```bash
npm run openapi:validate
```

## Categorias e exclusões

Categorias têm nome único por usuário e tipo. Uma transação precisa usar uma
categoria do mesmo usuário e do mesmo tipo. A exclusão é física quando não há
vínculos; se houver transações ou recorrências, a API recusa a operação para
preservar integridade histórica.

Transações são sempre excluídas fisicamente. Definições recorrentes são
excluídas fisicamente e aceitam dois modos transacionais: preservar os fatos
já gerados, removendo o vínculo, ou apagar também todas as ocorrências. As
operações destrutivas globais exigem frases literais de confirmação.

## Cartões, parcelas e recorrências

- Cartões somente podem ser associados a despesas.
- Uma compra parcelada gera exatamente N transações numa operação atômica.
- O último valor absorve diferenças de centavos.
- Ocorrências recorrentes usam constraint única por definição e competência.
- Consultas de períodos futuros materializam ocorrências necessárias de forma idempotente.
- Um checkpoint por recorrência faz consultas repetidas processarem somente o delta mensal; a gravação das ocorrências usa um único lote transacional.
- Excluir ou cancelar uma transação de cartão retira sua contribuição do limite.

## Google Sheets

A planilha possui uma aba por ano, resumo anual e mensal, despesas por
categoria e área de lançamentos. Somente novas despesas simples são importadas;
categorias, cartões, recorrências e parcelas continuam administrados no Cofre.

O schema atual da planilha é a versão 3. A primeira sincronização também aceita
a versão 2 e a regrava no formato atual, preservando a transição de produção.

## Migrations

As migrations são sequenciais, forward-only e registradas em
`schema_migrations`. Nunca edite uma migration já aplicada; toda evolução usa
um novo arquivo numerado.

A migration `0014_simplify_financial_model.sql` simplifica o modelo financeiro:
preserva categorias e movimentações existentes, remove metadados automáticos
antigos de receitas e mantém somente a preferência visual em `user_settings`.
A migration `0015_optimize_recurring_and_data_management.sql` adiciona os
checkpoints, índices de consulta e o marcador que obriga o Sheets a receber o
estado atual do Cofre antes de voltar a importar após uma exclusão.

## Testes

```bash
npm test
```

A suíte usa o Node Test Runner e bancos temporários. Ela cobre migrations,
autenticação, isolamento entre usuários, CRUD, exclusões físicas, resumos,
cartões, pagamentos, parcelamentos, recorrências e sincronização Google Sheets.
