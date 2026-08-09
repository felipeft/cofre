# Cofre — Frontend de controle financeiro pessoal

Frontend em React 19 + Vite + Tailwind v4, integrado à API real do Cofre
(Node.js + Express + SQLite). Nenhum dado é mockado — tudo vem do backend.

## Como rodar

```bash
cp .env.example .env   # aponte VITE_API_URL para a API (padrão: localhost:3000)
npm install
npm run dev
```

Requer o backend rodando (ver `backend/README.md`). Com os dois no padrão
(`localhost:5173` e `localhost:3000`), não é preciso ajustar nada — o
`.env.example` já vem pronto para desenvolvimento local.

## Árvore de `src/`

```
src/
├─ App.jsx / main.jsx
│
├─ api/                     Comunicação HTTP centralizada — único lugar que sabe a URL da API
│  ├─ client.js              fetch wrapper único (VITE_API_URL, credentials:'include', erros padronizados)
│  └─ endpoints.js           todos os caminhos da API em um só lugar
│
├─ services/                Fronteira única de acesso a dados — nada fora daqui faz fetch()
│  ├─ transaction.service.js  GET/POST/PUT/DELETE /transactions, + getAllTransactions() paginado internamente
│  ├─ category.service.js     GET/POST/PUT/DELETE /categories
│  ├─ dashboard.service.js    calcula indicadores a partir de GET /transactions (sem endpoint dedicado ainda)
│  └─ analytics.service.js    idem, para a página de Análises
│
├─ hooks/                   Lógica de estado/composição reutilizável, consumindo Services/Contexts
│  ├─ useTransactions.js      porta de entrada para o Context de transações
│  ├─ useTransactionsList.js  busca paginada/filtrada/ordenada do Histórico (não usa o Context)
│  ├─ useCategories.js        porta de entrada para o Context de categorias
│  ├─ useDashboard.js         dados prontos + loading/error para a página Dashboard
│  └─ useAnalytics.js         dados prontos + loading/error para a página Análises
│
├─ contexts/                Estado verdadeiramente global
│  ├─ TransactionsContext.jsx  lista agregada (Dashboard/Análises) + mutações + contador `version`
│  ├─ CategoriesContext.jsx    lista de categorias + CRUD — uma só fonte para toda a árvore
│  └─ ToastContext.jsx         fila de notificações
│
├─ constants/                Valores fixos fora dos componentes
│  ├─ routes.js               caminhos de rota (fonte única para App.jsx e navegação)
│  ├─ colors.js                cores usadas pelos gráficos (espelham os tokens do CSS)
│  └─ categories.js            paleta de cores/ícones do formulário de categoria
│
├─ components/               Design system e blocos de UI, sem regra de negócio de página
│  ├─ ui/                     Button, Input, Select, Card, Modal, Dialog, Toast, Badge, Loading...
│  ├─ charts/                 wrappers do Recharts já estilizados
│  ├─ dashboard/              StatCard, ShortcutButton
│  ├─ transactions/           TransactionRow
│  ├─ categories/             CategoryGroup, CategoryForm
│  ├─ settings/                SettingsGroup, SettingsRow
│  └─ forms/                  TransactionForm (usado no modal rápido e na página Registrar)
│
├─ layout/                   Casca da aplicação
│  ├─ AppShell.jsx, Sidebar.jsx, BottomNav.jsx, Header.jsx, navItems.js
│
├─ pages/                    Uma página por rota — só orquestram hooks + componentes
│  ├─ Dashboard.jsx  RegisterTransaction.jsx  History.jsx
│  └─ Analytics.jsx  Categories.jsx  Settings.jsx
│
├─ utils/                    Funções puras sem estado
│  ├─ formatters.js           moeda, datas
│  └─ aggregations.js         cálculos de saldo/breakdown/tendência (sobre dados reais)
│
├─ types/index.js            Typedefs JSDoc (Transaction, Category, PaginationMeta…) — refletem a API real
└─ styles/index.css          Design tokens (@theme) e estilos base
```

## Fluxo de dados

```
pages → hooks → services → api/client.js → Backend
```

Nenhuma página faz `fetch()`. Nenhum componente conhece uma URL. Toda
mutação (criar/editar/excluir) passa pelos Contexts (`TransactionsContext`,
`CategoriesContext`), que atualizam o estado local de forma otimista após a
resposta da API — o restante da interface reage automaticamente, sem reload.

## Decisões e por quê

- **Histórico não usa o `TransactionsContext`.** Dashboard e Análises
  precisam do conjunto (quase) completo de transações para calcular somas de
  vários meses, então o Context carrega tudo uma vez (paginando por baixo dos
  panos via `getAllTransactions()`). O Histórico faz o oposto: busca só a
  página atual, com os filtros/busca/ordenação aplicados no backend
  (`useTransactionsList.js`) — carregar tudo para filtrar no cliente é
  exatamente o que a paginação existe para evitar.
- **`version` conecta os dois mundos.** Toda mutação no `TransactionsContext`
  incrementa um contador; `useTransactionsList` observa esse contador e
  refaz sua própria busca. Assim, registrar uma transação pelo botão rápido
  enquanto o Histórico está aberto atualiza a lista sem os dois lados
  precisarem compartilhar o mesmo array.
- **`CategoriesContext` (não mais um hook local por tela).** Antes da API
  real, editar uma categoria na tela de Categorias não precisava refletir em
  outro lugar — eram mocks. Agora é uma escrita de verdade no banco, e o
  restante do app (dropdown do formulário, filtro do Histórico) precisa
  saber na hora: virou Context para ter uma única fonte de verdade.
- **`api/client.js` já usa `credentials: 'include'`** mesmo sem autenticação
  ainda — quando a sessão HTTP-only existir, nenhuma chamada precisa ser
  revisitada.
- **Sem React Query/SWR.** Conforme pedido nesta etapa, o cache/estado de
  requisição é feito só com `useState`/`useEffect` nos hooks acima — simples
  o suficiente para o tamanho atual do app.

## Como isso ajuda nas próximas etapas

- **OAuth Google / sessão:** o header de autenticação entra em
  `api/client.js` (um único lugar); os Contexts continuam do mesmo jeito.
- **Google Sheets:** vira só mais um Service (`sheets.service.js`) e um
  endpoint em `api/endpoints.js` — já reservado (`ENDPOINTS.sheets.sync`).
- **Endpoint dedicado de Dashboard/Analytics:** troca só o corpo de
  `dashboard.service.js`/`analytics.service.js` por uma chamada a
  `apiClient` — `useDashboard`/`useAnalytics` e as páginas não mudam.
