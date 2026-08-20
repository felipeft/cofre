# Cofre API — Backend

API do sistema financeiro **Cofre**: Node.js + Express + SQLite
(`better-sqlite3`). CRUD completo de categorias e transações, com regras
financeiras parametrizadas (oferta/dízimo). Sem autenticação ainda — isso
fica para uma etapa futura.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Não é preciso nenhum passo manual de banco: na primeira execução o SQLite é
criado automaticamente em `src/database/cofre.db` e as migrations pendentes
rodam sozinhas.

## Testes

```bash
npm test
```

Usa o test runner nativo do Node (`node --test`) — nenhuma dependência nova
foi adicionada só para testar. `tests/*.unit.test.js` testam o domínio puro
(sem banco); `tests/*.integration.test.js` sobem um SQLite temporário
isolado (apagado ao final) e chamam os Services de verdade.

## Regras financeiras (Fase 3, Etapa 7)

### Princípio

Nenhuma regra depende do **nome** de uma categoria, fonte ou transação.
"Ajuda do Pai" gera oferta e não dízimo não porque o backend tem um
`if (name === 'Pai')` em algum lugar — é porque a categoria "Ajuda do Pai"
foi *configurada* com `applyOffer: true, applyTithe: false`. Uma categoria
nova (ex: "Emprego CLT", "Freelancer") pode nascer com qualquer combinação
dessas flags, sem tocar em uma linha de código.

### Fonte de renda = categoria de receita

O domínio já tinha uma entidade que representa exatamente "de onde vem um
tipo de receita": a categoria (`type: 'income'`). Em vez de criar uma tabela
`income_sources` paralela e duplicada, esta etapa **estende `categories`**
com os campos de regra. Isso significa que tudo que já funcionava para
categorias — criar sem alterar código, desativar sem apagar histórico
(`isActive`/exclusão lógica), listar, filtrar — já vale para fontes de
renda de graça.

**Por que não existe `POST /income-sources`:** seria literalmente
`POST /categories` com `type=income` de novo, com outro nome. O prompt desta
etapa pedia explicitamente para não criar endpoints artificiais só para
seguir um nome sugerido — `/categories` já serve a esse propósito.

### Oferta e dízimo

Cada categoria de receita tem quatro campos novos:

| Campo | Tipo | Significado |
|---|---|---|
| `applyOffer` | boolean | Esta fonte gera oferta? |
| `offerRate` | number \| null | Taxa específica (0–1). `null` = usa o padrão global. |
| `applyTithe` | boolean | Esta fonte gera dízimo? |
| `titheRate` | number \| null | Taxa específica (0–1). `null` = usa o padrão global. |

Padrões globais em `src/constants/financialRules.js`:
`DEFAULT_OFFER_RATE = 0.01` (1%), `DEFAULT_TITHE_RATE = 0.1` (10%) — os
únicos lugares do backend onde esses números aparecem.

**Categoria de despesa não pode ativar essas flags** — `category.service.js`
recusa com `400 VALIDATION_ERROR` (não existe "dízimo do Mercado").

### Exemplo — exatamente o cenário do prompt

```bash
# Fonte "Pai": oferta sim, dízimo não
POST /categories
{ "name": "Ajuda do Pai", "type": "income", "color": "#3ecf8e", "icon": "Wallet",
  "applyOffer": true, "applyTithe": false }

# Recebendo R$2.000 dessa fonte:
POST /transactions
{ "description": "Ajuda mensal", "amount": 2000, "type": "income", "categoryId": 1, "date": "2026-07-05" }
# -> offerAmount: 20, titheAmount: 0

# Fonte "Emprego CLT": oferta sim, dízimo sim
POST /categories
{ "name": "Emprego CLT", "type": "income", ..., "applyOffer": true, "applyTithe": true }

# Recebendo R$10.000:
# -> offerAmount: 100, titheAmount: 1000
```

### Onde o cálculo mora e por que fica no `transaction`, não recalculado toda hora

`src/domain/financialRules.js` exporta `calculateIncomeObligations({ amount,
category })` — função pura, sem SQL, sem HTTP, testada isoladamente
(`tests/financialRules.unit.test.js`). `transaction.service.js` chama essa
função ao criar ou editar uma transação de receita e **grava o resultado**
nas colunas `offer_amount`/`tithe_amount`/`offer_rate_applied`/
`tithe_rate_applied` da própria transação (migration `0004`).

Essa escolha — snapshot na transação, em vez de recalcular a partir da
configuração *atual* da categoria toda vez que alguém consulta — é a que
resolve dois requisitos do prompt ao mesmo tempo:

1. **Idempotência (seção 21 do prompt):** editar uma transação sempre
   sobrescreve as mesmas 4 colunas da mesma linha. Nunca existe "Oferta 20"
   e "Oferta 25" coexistindo — só existe o valor atual daquela transação.
   Testado em `Caso 6` (`tests/transactions.integration.test.js`).
2. **Histórico não muda retroativamente (seção 22 do prompt):** se a taxa de
   "Freelancer" mudar de 1% para 5% hoje, transações antigas continuam com
   o valor calculado na época — só transações *novas* usam a taxa nova.
   Testado explicitamente em `Caso 7`.

A alternativa mais "correta" em teoria seria um histórico de versões da
taxa (`valid_from`/`valid_until` na categoria) e recalcular sob demanda. O
prompt pediu para avaliar essa opção mas não implementar complexidade sem
necessidade — o snapshot por transação dá a mesma garantia de não-corrupção
histórica com uma fração da complexidade. Fica registrado como uma decisão
a revisitar se um dia for preciso *recalcular em lote* um histórico inteiro
sob uma regra nova (ver "Decisões a revisar" no final).

### Resumo financeiro

```
GET /transactions/summary?month=7&year=2026
```

```json
{
  "totalIncome": 7000,
  "totalExpenses": 300,
  "offerAmount": 70,
  "titheAmount": 500,
  "offerAndTitheTotal": 570,
  "balance": 6130
}
```

Regra explícita (não deixada implícita, como o prompt pediu): `totalExpenses`
**nunca inclui** oferta/dízimo — essas obrigações são um recorte da receita,
não uma despesa lançada à parte. `balance = totalIncome − totalExpenses −
offerAndTitheTotal`. `month`/`year` funcionam para qualquer ano (testado
com 2025, 2026, 2030, 2032 nos testes automatizados) — nada assume "estamos
em 2026".

## Rotas

| Rota | Descrição |
|---|---|
| `GET /`, `/health`, `/version`, `/status` | Infraestrutura |
| `GET /categories` | Lista — `?type=income\|expense`, `?includeInactive=true` |
| `GET /categories/:id` | Busca uma categoria |
| `POST /categories` | Cria — `{ name, type, color, icon, isActive?, sortOrder?, applyOffer?, offerRate?, applyTithe?, titheRate? }` |
| `PUT /categories/:id` | Atualiza (parcial) |
| `DELETE /categories/:id` | Exclui — vira desativação lógica se houver transações associadas |
| `GET /transactions/summary` | **Novo** — resumo financeiro de uma competência (`?month=&year=`, obrigatórios) |
| `GET /transactions` | Lista paginada |
| `GET /transactions/:id` | Busca uma transação (com categoria e obrigações já populadas) |
| `POST /transactions` | Cria — mesmos campos de antes; `offerAmount`/`titheAmount` são calculados, não enviados pelo cliente |
| `PUT /transactions/:id` | Atualiza (parcial) — recalcula obrigações se `amount`/`categoryId`/`type` mudarem |
| `DELETE /transactions/:id` | Exclui |

Nenhum endpoint existente foi removido ou teve seu contrato quebrado —
`GET /transactions` e `GET /transactions/:id` só passaram a incluir 4 campos
novos na resposta (`offerAmount`, `titheAmount`, `offerRateApplied`,
`titheRateApplied`), que qualquer cliente antigo simplesmente ignora.

Toda resposta segue `{ success, data, message }` (+ `meta` nas listagens
paginadas); erros seguem `{ success: false, message, code, details }`.

## Scripts

```bash
npm run dev       # nodemon, com reload automático
npm run start     # produção, sem reload
npm run migrate   # aplica migrations pendentes manualmente
npm run seed      # roda seeds (nenhum registrado ainda)
npm test          # testes automatizados (node --test)
```

## Arquitetura

```
Routes → Controllers → Services → Repositories → SQLite
                           ↓
                  domain/ (regras financeiras puras)
```

`domain/` é novo nesta etapa: funções puras (`financialRules.js`,
`financialSummary.js`) sem SQL e sem HTTP, chamadas pelos Services. Existem
separadas de `services/` porque representam uma coisa conceitualmente
diferente — "a regra de negócio em si", testável sem banco — do que
"orquestrar repository + regra + mapear resposta", que é o papel de
`transaction.service.js`/`category.service.js`.

## Migrations desta etapa

| Arquivo | O que faz |
|---|---|
| `0003_add_financial_rules_to_categories.sql` | `apply_offer`, `offer_rate`, `apply_tithe`, `tithe_rate` em `categories` |
| `0004_add_income_obligations_to_transactions.sql` | `offer_amount`, `tithe_amount`, `offer_rate_applied`, `tithe_rate_applied` em `transactions` |

Ambas testadas em banco novo e em cima de um banco simulado com dados
pré-existentes (categorias/transações criadas só com o schema *anterior* a
esta etapa) — nos dois casos as migrations aplicam limpo e os dados antigos
saem com defaults sãos (`apply_offer=0`, `offer_amount=0`, etc.), nunca
`NULL` onde o domínio espera um número.

## Notas de implementação (etapas anteriores, ainda válidas)

- **CORS multi-origem**: `FRONTEND_URLS` no `.env`, lista separada por
  vírgula; `config.cors.allowedOrigins` é a única fonte consultada.
- **Express 5**: `req.query` é somente-leitura nessa versão — o resultado
  validado/coercionado fica em `req.validated[source]`.
- **Schemas de criação vs. atualização são definidos separadamente**
  (mesmo cuidado aplicado agora a `applyOffer`/`offerRate`/`applyTithe`/
  `titheRate`): um `.default()` sobrevive a `.partial()`, então os campos
  de update nunca têm `.default()`.

## Testes executados

- `npm test`: **22/22 passando** (12 unitários de `financialRules`, 3 de
  `financialSummary`, e 7 suítes de integração cobrindo os casos do
  prompt: Pai, Emprego, sem oferta, sem dízimo, valor zero, taxa
  customizada, taxa zero explícita, arredondamento, duplicidade de
  categoria, categoria de despesa recusando oferta/dízimo, atualização sem
  duplicar, histórico após desativação, taxa nova não afeta o passado,
  despesa recorrente sem depender do nome, resumo financeiro sem contar em
  dobro, resumo funcionando fora de 2026).
- Migrations aplicadas em banco novo e em banco com dados pré-existentes
  (simulando um upgrade real) — ambos sem erro, sem perda de dado.
- Regressão manual via `curl` de toda a API (infra, CORS, CRUD de
  categorias e transações, paginação, filtros, ordenação, validações) —
  nada quebrou.
- `npm run migrate` duas vezes seguidas — segunda vez não aplica nada
  (idempotente), como esperado.

## Fora do escopo desta etapa (de propósito)

A pedido explícito, esta etapa ficou restrita a regras de oferta/dízimo.
Ficam para a etapa seguinte (Cartões e Parcelamentos):

- Cartões como entidade própria (limite, dia de fechamento/vencimento).
- Geração de parcelas a partir de uma compra única.
- Qualquer automação/estrutura nova de despesas recorrentes (o domínio já
  tinha `isRecurring`/`isFixed` desde o CRUD original — nenhuma coluna nova
  de recorrência foi adicionada nesta etapa; `Caso 8` dos testes usa só o
  que já existia).

## Decisões a revisar futuramente

- **Snapshot vs. versionamento temporal completo**: se um dia for
  necessário recalcular em lote um histórico inteiro sob uma regra nova
  (ex: "aplicar a nova taxa retroativamente a partir de tal data"), o
  snapshot atual não suporta isso — precisaria de um histórico de versões
  da taxa (`valid_from`/`valid_until`) na categoria. Não implementado agora
  porque nenhum requisito desta etapa pedia recálculo retroativo.
- **Rollback de migrations**: o runner é forward-only (mesma decisão da
  etapa de infraestrutura, não alterada aqui). Migrations `ADD COLUMN` são
  de baixo risco (não há como "perder dados" na maioria dos casos), mas não
  há um mecanismo de `down` formal se um dia for preciso reverter.
