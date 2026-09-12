# COFRE — Mapa da arquitetura real

## Backend

```text
src/server.js
  → database/bootstrap.ensureDatabaseReady()
    → database/connection.getDatabase() [SQLite singleton, WAL, FK ON]
    → database/migrate.runMigrations() [schema_migrations + SQL numerado]
  → app.listen()

src/app.js
  → requestId → CORS → express.json → requestLogger
  → routes/index.js
  → notFound → errorHandler
```

### Rotas a fluxos

```text
GET|POST|PUT|DELETE /categories
  routes/category.routes.js
  → validate(category.schema.js)
  → controllers/category.controller.js
  → services/category.service.js
  → repositories/category.repository.js
     + repositories/transaction.repository.js (verifica uso na exclusão)
  → utils/mappers/category.mapper.js
  → utils/apiResponse.js

GET|POST|PUT|DELETE /transactions, GET /transactions/summary
  routes/transaction.routes.js
  → validate(transaction.schema.js)
  → controllers/transaction.controller.js
  → services/transaction.service.js
     → repositories/category.repository.js / card.repository.js
     → domain/financialRules.js [criar/editar receita]
     → domain/installmentPlan.js [compra parcelada]
     → domain/financialSummary.js [summary]
     → utils/competence.js
     → repositories/transaction.repository.js
  → utils/mappers/transaction.mapper.js
  → utils/apiResponse.js

GET|POST|PUT|DELETE /cards, GET /cards/:id/summary
  routes/card.routes.js
  → validate(card.schema.js)
  → controllers/card.controller.js
  → services/card.service.js
     → repositories/card.repository.js
     → repositories/transaction.repository.js
     → domain/cardLimit.js [summary]
  → utils/mappers/card.mapper.js
  → utils/apiResponse.js
```

`validate.middleware.js` deposita dados Zod coerced em `req.validated[source]`. `asyncHandler.js` entrega exceções ao `errorHandler.middleware.js`; este traduz as classes em `errors/` para o envelope de erro.

### Persistência

```text
service (camelCase) → repository (SQL / snake_case) → SQLite
SQLite row + JOIN category/card → mapper → API camelCase
```

`transaction.repository.js` centraliza o join `transactions → categories` e `LEFT JOIN credit_cards`, evitando N+1 para renderizar categoria e cartão. O repository também possui `createMany` com `better-sqlite3` transaction para parcelas.

## Frontend

```text
src/main.jsx
  → <App />
    → CategoriesProvider
      → CardsProvider
        → TransactionsProvider
          → ToastProvider
            → BrowserRouter → AppShell → página
```

### Rotas e páginas

| Rota (`constants/routes.js`) | Página | Dados/coordenação principal |
| --- | --- | --- |
| dashboard | `pages/Dashboard.jsx` | `useDashboard` → `dashboard.service` → agregações |
| register | `pages/RegisterTransaction.jsx` | `TransactionForm` + `useTransactions` |
| history | `pages/History.jsx` | `useTransactionsList` paginado + mutações do context |
| analytics | `pages/Analytics.jsx` | `useAnalytics` → `analytics.service` → agregações |
| categories | `pages/Categories.jsx` | `useCategories` + `CategoryForm` |
| cards | `pages/Cards.jsx` | `useCards` + `CardForm`; summaries por `card.service` |
| settings | `pages/Settings.jsx` | componentes de configuração atuais |

### Caminho de dados

```text
Page/component
  → hook (useTransactions/useCategories/useCards ou hook de página)
  → Context (estado global e mutações) ou service
  → services/*.service.js
  → api/endpoints.js + api/client.js
  → fetch(VITE_API_URL + endpoint)
  → API Cofre
```

- `TransactionsContext`: coordena mutações e mantém `version`, sem carregar todo o histórico na inicialização. Dashboard e Análises buscam apenas sua janela temporal; Histórico permanece paginado.
- `useTransactionsList`: é deliberadamente separado do Context para History; chama `transaction.service.getTransactions` com filtros/paginação e observa `version` para refresh.
- `CategoriesContext` e `CardsContext`: lista global ativa e CRUD; formulário consome ambos. Exclusões livres são físicas e vínculos bloqueadores são apresentados por uma prévia da API.
- `api/client.js`: normaliza a URL, envia `credentials: include`, interpreta envelope e lança `ApiError` padronizado.

### Componentes de domínio existentes

```text
TransactionForm
  ← useCategories + useCards
  → callback de página → TransactionsContext.add/updateTransaction

TransactionRow / History
  ← transaction.category, transaction.card, transaction.installments

Cards
  ← CardsContext
  → card.service.getCardSummary (limite calculado pelo backend)

Dashboard / Analytics
  ← TransactionsContext + CategoriesContext
  → services dashboard/analytics → utils/aggregations + Recharts
```

## Testes

```text
backend/tests/*.unit.test.js
  → funções puras de src/domain

backend/tests/*.integration.test.js
  → setup SQLite temporário
  → services reais
  → repositories / migrations / banco
```

Os testes de integração não exercitam HTTP/Express diretamente; testam a composição a partir do service. Não há suíte frontend no repositório atual.

## Pontos de encaixe, sem implementação

Uma futura definição de recorrência precisará de migration, schema, repository, service, controller, route, mapper e provavelmente service/context/hook/página/componentes correspondentes no frontend. A criação de ocorrência deve preservar o caminho de criação de transação e suas invariantes, especialmente a validação de categoria/cartão, competência, snapshots financeiros e cálculo de limite via `card_id`.
