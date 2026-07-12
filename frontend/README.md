# Cofre — Frontend de controle financeiro pessoal

Frontend em React 19 + Vite + Tailwind v4, hoje sem backend (dados mockados), já organizado em camadas para receber Node.js + Express, SQLite, OAuth do Google e integração com Google Sheets nas próximas etapas.

## Como rodar

```bash
cp .env.example .env   # ajuste VITE_API_URL quando o backend existir
npm install
npm run dev
```

## Árvore de `src/`

```
src/
├─ App.jsx / main.jsx
│
├─ api/                     Comunicação HTTP centralizada (ainda não usada de verdade)
│  ├─ client.js              fetch wrapper único (base URL via VITE_API_URL, headers, erros)
│  └─ endpoints.js           todos os caminhos da futura API em um só lugar
│
├─ services/                Fronteira única de acesso a dados — nada fora daqui lê `data/`
│  ├─ transaction.service.js
│  ├─ category.service.js
│  ├─ dashboard.service.js
│  └─ analytics.service.js
│
├─ data/                    Mocks — moldados exatamente como as futuras respostas da API
│  ├─ transactions.mock.js
│  └─ categories.mock.js
│
├─ hooks/                   Lógica de estado/composição reutilizável, consumindo Services
│  ├─ useTransactions.js     porta de entrada para o Context de transações
│  ├─ useCategories.js       leitura de categorias (Histórico, Dashboard, Análises, formulário)
│  ├─ useCategoryManager.js  CRUD local usado só pela tela de Categorias
│  ├─ useDashboard.js        dados prontos para a página Dashboard
│  └─ useAnalytics.js        dados prontos para a página Análises
│
├─ contexts/                Estado verdadeiramente global
│  ├─ TransactionsContext.jsx  lista de transações (compartilhada por várias telas)
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
│  ├─ aggregations.js         cálculos de saldo/breakdown/tendência
│  └─ transactionFilters.js   busca/filtro/ordenação do Histórico
│
├─ types/index.js            Typedefs JSDoc (Transaction, Category, MonthSummary…)
└─ styles/index.css          Design tokens (@theme) e estilos base
```

## Decisões e por quê

- **`layout/` no nível raiz, não dentro de `components/`.** É a casca fixa da aplicação (sidebar, bottom nav, shell), conceitualmente diferente de um componente de UI reutilizável — fica ao lado de `pages/`, não dentro de `components/`.
- **Services síncronos por enquanto.** Eles já têm a assinatura definitiva (`transaction.service.js`, `category.service.js`...) e cada função tem um comentário `// Futuro: apiClient.get(...)` indicando exatamente o que muda quando o backend chegar. Como a fonte hoje é só um mock em memória, forçar `async`/`Promise` não mudaria nenhum comportamento visível — só adicionaria ruído.
- **Dois hooks de categoria, não um.** `useCategories` é leitura compartilhada (Histórico, Dashboard, Análises, formulário). `useCategoryManager` é o CRUD local exclusivo da tela de Categorias — replica o comportamento que já existia (editar uma categoria ali nunca refletia nas outras telas), então a refatoração não alterou nada visível.
- **Context apenas para o que é de fato global:** `TransactionsContext` (lista usada por 4+ telas) e `ToastContext` (notificação pode ser disparada de qualquer lugar). Não criei Context de tema (só existe modo escuro) nem de sidebar (estado puramente local do `AppShell`, sem motivo para vazar para o resto da árvore).
- **`types/index.js` com JSDoc, não TypeScript.** Documenta o contrato de dados (`Transaction`, `Category`, `MonthSummary`) com autocomplete no editor, sem migrar o build para `.tsx` — mudança arriscada demais para uma etapa que não deveria alterar comportamento.

## Como isso ajuda nas próximas etapas

- **Backend Node/Express + SQLite:** trocar o corpo de cada função em `services/` para chamar `apiClient` (já pronto em `api/client.js`) usando os caminhos de `api/endpoints.js`. Nenhuma página muda.
- **OAuth Google:** o header de autenticação entra em `api/client.js` (um único lugar); `ToastContext`/`TransactionsContext` continuam do mesmo jeito.
- **Google Sheets:** vira só mais um Service (`sheets.service.js`) e um endpoint em `api/endpoints.js` — já reservado (`ENDPOINTS.sheets.sync`).
- **Dashboard dinâmico / CRUD completo:** `hooks/useDashboard.js` e `useAnalytics.js` já isolam a página da forma como o dado é calculado; quando isso migrar do cliente para o backend, só o `dashboard.service.js`/`analytics.service.js` muda.
