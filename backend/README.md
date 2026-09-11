# Cofre API — Backend

API do sistema financeiro **Cofre**: Node.js + Express + libSQL/Turso.
Inclui Google OAuth, sessões persistentes, perfil e preferências individuais,
categorias, transações, regras financeiras parametrizadas, cartões,
parcelamentos, gastos recorrentes, pagamentos de fatura e isolamento de dados
por usuário. A Fase 4 está concluída. A Etapa 12 adiciona integração opcional
com Google Sheets e aguarda validação final contra as APIs reais em produção.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Não é preciso criar o schema manualmente: no desenvolvimento, o arquivo local
é criado automaticamente; em produção, `TURSO_DATABASE_URL` e
`TURSO_AUTH_TOKEN` apontam para o Turso. As migrations pendentes rodam no bootstrap.

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
categorias — criar sem alterar código, ativar/desativar, listar e filtrar —
já vale para fontes de renda. `DELETE` é físico quando a categoria está
livre e é recusado quando existem transações vinculadas.

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
| `DELETE /categories/:id` | Exclui fisicamente; recusa se houver transações associadas |
| `GET /transactions/summary` | **Novo** — resumo financeiro de uma competência (`?month=&year=`, obrigatórios) |
| `GET /transactions` | Lista paginada |
| `GET /transactions/:id` | Busca uma transação (com categoria e obrigações já populadas) |
| `POST /transactions` | Cria — mesmos campos de antes; `offerAmount`/`titheAmount` são calculados, não enviados pelo cliente |
| `PUT /transactions/:id` | Atualiza (parcial) — recalcula obrigações se `amount`/`categoryId`/`type` mudarem |
| `DELETE /transactions/:id` | Exclui |
| `GET /cards` | Lista cartões (`?includeInactive=true` inclui inativos) |
| `GET /cards/:id/summary` | Retorna compras, pagamentos e limite utilizado/disponível |
| `POST /cards/:id/payments` | Registra pagamento manual de fatura |
| `POST /cards`, `PUT /cards/:id`, `DELETE /cards/:id` | CRUD de cartões |
| `GET /recurring-expenses` | Lista regras recorrentes |
| `POST /recurring-expenses` | Cria regra e reconcilia ocorrências até o mês atual |
| `GET /recurring-expenses/:id`, `PUT /recurring-expenses/:id` | Consulta e edita recorrência |
| `DELETE /recurring-expenses/:id` | Desativa a regra preservando ocorrências |

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
Routes → Auth/Validation → Controllers → Services → Repositories → libSQL/Turso
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

## Validação registrada ao final da Etapa 7

- Na conclusão daquela etapa, `npm test` registrou **22/22 passando** (12 unitários de `financialRules`, 3 de
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

---

## Fase 3, Etapa 8 — Cartões e Parcelamentos

### Modelo de cartão

Nova entidade `credit_cards` (migration `0005`): `name`, `creditLimit`,
`closingDay`, `dueDay`, `isActive`. Segue exatamente o padrão de
`categories` — um cartão com transações associadas não pode ser removido
sem destruir fatos financeiros; `DELETE /cards/:id` recusa nesse caso e
nunca o oculta por desativação automática.

`transactions.card_id` (migration `0006`) é o relacionamento real por ID
que faltava. A coluna antiga `card` (texto livre, criada numa etapa
anterior) **permanece intocada no banco** — não editamos uma migration já
aplicada, e assim nenhum dado existente é perdido — mas deixou de ser
exposta pela API: o mapper agora expõe `card: { id, name } | null`, sempre
o cartão relacional. Nada no frontend lia o campo antigo, então não houve
quebra de contrato real.

### Regra de fechamento/vencimento e geração de parcelas

Documentada em `src/domain/installmentPlan.js`. Resumo:

1. Compra até o dia do fechamento → entra no ciclo que fecha **neste** mês.
   Depois do fechamento → ciclo do mês **seguinte**.
2. Dentro do ciclo, se `dueDay > closingDay` (caso comum: fecha dia 10,
   vence dia 20), o vencimento cai no mesmo mês do fechamento. Se
   `dueDay <= closingDay`, o vencimento rola para o mês seguinte.
3. Cada parcela subsequente soma +1 mês ao vencimento da parcela anterior
   (com clamp de dia — dia 31 vira dia 28/29/30 num mês mais curto).
4. `date` de cada parcela é o **vencimento daquela parcela específica**, e
   `competence` continua sendo simplesmente derivada de `date`
   (`utils/competence.js`, sem mudança de semântica) — cada parcela cai na
   competência financeira correta, não todas na competência da compra
   original.

Esta é uma decisão de negócio que o prompt desta etapa deixou em aberto
("se houver ambiguidade, escolha o mais simples e documente") — a
alternativa seria negociável, mas esta regra é determinística, testada
(`tests/installmentPlan.unit.test.js`) e cobre exatamente o exemplo do
prompt (compra 20/08, fecha 10/vence 20 → primeira parcela 20/09).

### Arredondamento

`amount total / N`, arredondado a 2 casas em cada parcela; a diferença
residual (poucos centavos, na pior das hipóteses) é somada à **última**
parcela. Garante `soma das parcelas === valor original` sempre — testado
inclusive com valores que não dividem exatamente (R$100 ÷ 3, R$1000 ÷ 7).

### Sem duplicação, atomicidade

`POST /transactions` com `cardId` + `installmentTotal > 1` gera as N
parcelas numa única chamada a `transactionRepository.createMany()`, que
executa tudo dentro de uma transação libSQL: **OU as N
parcelas são criadas, OU nenhuma** (rollback automático em qualquer erro no
meio do lote — testado explicitamente forçando uma violação de FK no meio
de um lote de 2 linhas). Não existe uma linha extra "da compra original":
o conjunto de parcelas *é* a compra.

### Limite de crédito

`GET /cards/:id/summary` retorna `creditLimit`, `usedLimit`,
`availableLimit`, `purchasesTotal` e `paidAmount`. As compras não canceladas
comprometem o limite, inclusive parcelas futuras. Pagamentos registrados em
`credit_card_payments` reduzem esse compromisso sem criar uma segunda
despesa financeira, pois a compra original já foi contabilizada.

### Validações implementadas

- `cardId` deve existir (404 se não).
- Cartão inativo não aceita novas compras (400).
- Cartão só pode ser associado a despesa — receita com `cardId` é
  rejeitada (400), o que **também** bloqueia parcelamento de receita (uma
  regra cobre as duas).
- `installmentTotal` é inteiro positivo, com teto de 60 parcelas
  (`constants/cards.js` — não é uma regra "financeira", só um limite
  sensato contra erro de digitação).
- Nome de cartão duplicado é rejeitado (409), mesmo padrão de categorias.

### Endpoints novos

| Rota | Descrição |
|---|---|
| `GET /cards` | Lista — `?includeInactive=true` |
| `GET /cards/:id` | Busca um cartão |
| `GET /cards/:id/summary` | Limite total/usado/disponível |
| `POST /cards` | Cria — `{ name, creditLimit, closingDay, dueDay, isActive? }` |
| `PUT /cards/:id` | Atualiza (parcial) |
| `DELETE /cards/:id` | Exclui fisicamente; recusa se houver compras associadas |

`POST /transactions` (rota existente) passou a aceitar `cardId` e
`installmentTotal` opcionais — sem `cardId`, comportamento idêntico a
antes. Com `cardId` e `installmentTotal > 1`, a resposta muda de forma
(`data` vira `{ installmentGroupId, count, transactions: [...] }` em vez de
uma transação única) — documentado no frontend (`TransactionsContext.jsx`)
como a única mudança de contrato desta etapa.

`GET /transactions` ganhou dois filtros novos, opcionais: `cardId` e
`installmentGroupId` (mesma extensão natural do padrão já usado por
`categoryId`).

### Validação registrada ao final da Etapa 8

Na conclusão daquela etapa, `npm test` registrou **57/57 passando** no total
(35 novos). Os testes cobriam
literalmente os 22 itens pedidos na seção 24 do prompt: CRUD de cartão
completo, duplicidade, compra normal/1x/parcelada, sequência
`installmentCurrent`/`installmentTotal`, `installmentGroupId` compartilhado,
`cardId` compartilhado, datas do ciclo de fatura, soma exata, arredondamento,
bloqueio de parcelamento de receita, bloqueio de cartão inativo, cálculo de
limite (incluindo o caso de transação cancelada não contar), e atomicidade
forçando uma falha no meio de um lote.

### Fora do escopo desta etapa (de propósito)

- Juros, rotativo, atraso e encargos. O pagamento manual de fatura foi
  acrescentado posteriormente; não há geração automática de fatura.
- Cartão adicional, cashback, pontos.
- Regenerar/cascatear as parcelas-irmãs quando uma parcela individual é
  editada via `PUT /transactions/:id` — a edição continua funcionando como
  antes (campo a campo, na própria linha), só não propaga para o grupo.
- Qualquer filtro/UI de fatura mensal agrupada — o Histórico mostra cada
  parcela como uma linha própria, com o cartão e "N/total" visíveis.

### Decisão a revisar futuramente

Se um dia for necessário editar uma compra parcelada inteira (ex: mudar o
cartão de todas as 12 parcelas de uma vez), vai ser preciso um endpoint
dedicado que opere sobre `installmentGroupId` — hoje cada parcela só pode
ser editada individualmente, como qualquer outra transação.

---

## Fase 3, Etapa 9 — Gastos recorrentes

**Status: concluída.**

`recurring_expenses` representa a regra mensal; cada ocorrência é uma linha
normal de `transactions` com `recurring_expense_id`. Isso não é
parcelamento: ocorrências não recebem `installment_group_id`, nem campos de
parcela.

`0007_create_recurring_expenses.sql` cria a regra, adiciona a FK opcional na
transação e um índice único parcial em `(recurring_expense_id,
competence_year, competence_month)`. A restrição também considera uma
ocorrência `cancelled`, portanto a reconciliação jamais recria um mês que o
usuário cancelou.

### Geração automática

A reconciliação ocorre no bootstrap, ao criar/editar uma regra e antes de
listar ou resumir transações. Ela gera somente competências entre
`start_date` e o mês corrente — não projeta meses futuros ilimitados. Cada
lote é inserido em transação SQLite com `INSERT OR IGNORE`; o índice único é
a garantia final contra corridas e duplicidade.

A primeira data nunca antecede `start_date`; `end_date` é inclusiva apenas
quando a data mensal cabe nela. Para dias 29–31, meses menores usam seu
último dia válido. Desativar via `DELETE /recurring-expenses/:id` é uma
desativação lógica: fatos e configuração permanecem. Alterar uma regra só
afeta competências ainda ausentes, preservando as transações existentes.

Uma regra pode apontar para cartão ativo. Cada ocorrência recebe `card_id` e
participa do limite normal, mas não recebe lógica de parcelamento: a data da
cobrança é a data configurada da recorrência. Se o cartão for desativado,
novas ocorrências dessa regra ficam suspensas até o usuário ajustar a regra;
as anteriores permanecem.

### Rotas

| Rota | Descrição |
|---|---|
| `GET /recurring-expenses` | Lista regras ativas (`?includeInactive=true` inclui inativas) |
| `POST /recurring-expenses` | Cria uma regra de despesa mensal |
| `GET /recurring-expenses/:id` | Consulta uma regra |
| `PUT /recurring-expenses/:id` | Atualiza a configuração futura |
| `DELETE /recurring-expenses/:id` | Desativa a regra e preserva histórico |

### Semântica de exclusão

`DELETE /transactions/:id` remove a transação fisicamente; por isso ela deixa
de participar imediatamente do limite de seu cartão. `DELETE /cards/:id` e
`DELETE /categories/:id` também removem fisicamente quando não há vínculos.
Se houver transações associadas, a API responde `409 Conflict`: ela não
oculta o registro com `is_active = 0`, pois isso faria a interface divergir
do banco e manteria nomes/limites bloqueados sem transparência.

A única exceção deliberada é `DELETE /recurring-expenses/:id`: esse endpoint
é semanticamente uma desativação da regra (`is_active = 0`) para preservar
as ocorrências financeiras que ela já originou. A interface chama essa ação
de **Desativar**, não de excluir.

---

## Pagamento manual de fatura

Uma compra no cartão já é uma despesa no modelo atual. Por isso, registrar o
pagamento da fatura não cria uma segunda `transaction`: ele cria um registro
em `credit_card_payments` que liquida o limite utilizado. O resumo do cartão
expõe `purchasesTotal`, `paidAmount`, `usedLimit` e `availableLimit`.

| Rota | Descrição |
|---|---|
| `POST /cards/:id/payments` | Registra `{ amount, paidAt, notes? }` e reduz o limite utilizado |

O valor não pode ultrapassar o limite em aberto. Um pagamento integral zera
o limite usado; compras ou recorrências posteriores voltam a comprometê-lo.
O registro é manual nesta etapa: fechamento e vencimento continuam
informações configuradas do cartão, sem criar automaticamente uma segunda
despesa no vencimento.

## Estado atual dos testes

A suíte atual reúne testes unitários e de integração para regras
financeiras, cartões, parcelamentos, recorrências, idempotência, exclusões e
pagamentos de fatura. Execute-a obrigatoriamente com Node.js 22.x:

```bash
npm test
```

O backend usa `@libsql/client`, sem depender do filesystem do Render para
persistir dados ou sessões.

---

## Fase 4, Etapa 10 — Google OAuth

**Status: concluída e validada em produção no Chrome e no Safari do iPhone.**

O backend executa Authorization Code Flow com PKCE, `state` e `nonce`, valida
a assinatura e os claims do ID Token do Google e aplica a whitelist definida
em `AUTH_ALLOWED_EMAILS`. Tokens do Google não são persistidos.

As sessões usam identificadores aleatórios; somente o hash fica em `sessions`.
O cookie é HTTP-only, `Secure` em produção, `SameSite=Lax` e possui duração
configurável. As rotas de negócio exigem sessão e todos os repositories filtram
simultaneamente pelo identificador do recurso e `user_id`.

A migration `0009_add_authentication_and_user_ownership.sql` cria `users`,
`sessions` e tentativas OAuth, adiciona `user_id` às entidades privadas e
transforma unicidades globais em unicidades por usuário. Dados legados somente
são reivindicados pelo e-mail explícito de `AUTH_LEGACY_OWNER_EMAIL`.

Em produção, o frontend chama `/api`; a Vercel encaminha para o Render. Assim o
cookie pertence ao site da Vercel e não depende de cookies de terceiros no
Safari.

---

## Fase 4, Etapa 11 — Configurações do usuário

**Status: concluída.**

A migration `0010_create_user_settings.sql` acrescenta `display_name` a
`users` e cria `user_settings` em relação 1:1, com criação automática para
novos usuários e backfill dos usuários existentes. Identidade externa
(`google_sub`, e-mail e nome Google) continua separada do nome preferido no
Cofre.

As preferências implementadas possuem utilidade direta no domínio atual:

| Campo | Default | Uso |
|---|---:|---|
| `default_offer_rate` | `0.01` | Oferta de novas receitas sem taxa específica na categoria |
| `default_tithe_rate` | `0.10` | Dízimo de novas receitas sem taxa específica na categoria |

A precedência é: taxa específica da categoria → preferência do usuário →
constante do sistema. O Service carrega categoria e settings, passa as taxas
explicitamente à função pura de domínio e grava o snapshot na transação.
Alterar settings não recalcula o histórico.

Endpoints autenticados, sempre orientados à sessão atual:

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/profile` | Identidade Google e perfil Cofre seguros |
| `PATCH` | `/profile` | Atualiza somente `displayName` |
| `GET` | `/settings` | Preferências do usuário, criando defaults se necessário |
| `PATCH` | `/settings` | Atualização parcial validada das taxas padrão |

Nenhum endpoint aceita `userId` como origem da autorização. Os schemas são
estritos para impedir mass assignment de e-mail, identidade Google ou outro
campo interno. `/auth/me` também informa apenas datas seguras da sessão atual,
sem expor token ou hash.

Moeda, locale, timezone e tema não foram expostos nesta etapa: a aplicação
ainda implementa concretamente apenas BRL, `pt-BR` e tema escuro, e persistir
alternativas sem comportamento real criaria configurações artificiais.

Validação local da Etapa 11 incluiu dois
usuários, isolamento, atualização parcial, mass assignment, precedência de
taxas, snapshot histórico e regressão integral das funcionalidades anteriores.

---

## Fase 5, Etapa 12 — Google Sheets

**Status: implementação local concluída; validação das APIs reais em produção
pendente.**

A autorização é incremental e independente do login. O login continua usando
somente identidade; a integração solicita voluntariamente o scope não sensível
`drive.file`, com `state`, PKCE, nonce e acesso offline. Somente o refresh token
é persistido, criptografado com AES-256-GCM; access tokens existem apenas em
memória durante cada operação.

A migration `0011_create_google_sheets_integrations.sql` cria a integração 1:1,
tentativas OAuth persistentes e fingerprints de lotes importados. Cada operação
usa exclusivamente `req.user.id`.

Endpoints:

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/integrations/google-sheets` | Estado seguro da integração |
| `GET` | `/integrations/google-sheets/connect` | Inicia consentimento incremental |
| `GET` | `/integrations/google-sheets/callback` | Valida e persiste autorização |
| `POST` | `/integrations/google-sheets/spreadsheet` | Cria e inicializa a planilha |
| `POST` | `/integrations/google-sheets/export` | Exportação manual idempotente |
| `POST` | `/integrations/google-sheets/import/preview` | Validação e resumo da importação |
| `POST` | `/integrations/google-sheets/import` | Confirma lote validado e atômico |
| `DELETE` | `/integrations/google-sheets` | Revoga credencial sem apagar arquivo |

A planilha possui `Metadata`, `Categorias`, `Cartões`, `Gastos Recorrentes`,
`Pagamentos de Fatura`, `Configurações` e abas anuais. Abas futuras necessárias
para parcelas também são criadas. Exportações reconstroem somente intervalos
gerenciados usando operações batch e `valueInputOption=RAW`; abas externas do
usuário não são tocadas.

A importação lê apenas o schema Cofre v1. IDs existentes divergentes são
conflitos, referências precisam pertencer ao usuário e linhas sem ID podem ser
inseridas como fatos novos. O preview é recalculado na confirmação, e o lote é
gravado em uma transação libSQL com fingerprint idempotente.

Variáveis adicionais:

```env
GOOGLE_SHEETS_CALLBACK_URL=http://localhost:5173/api/integrations/google-sheets/callback
# GOOGLE_TOKEN_ENCRYPTION_KEY= # base64 de 32 bytes; nunca versionar
```

Suíte completa após a Etapa 12: **93 testes aprovados, 0 falhas**.
