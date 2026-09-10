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
│  ├─ card.service.js         CRUD, resumo de limite e pagamento de fatura
│  ├─ recurringExpense.service.js  CRUD das definições recorrentes
│  ├─ dashboard.service.js    calcula indicadores a partir de GET /transactions (sem endpoint dedicado ainda)
│  └─ analytics.service.js    idem, para a página de Análises
│
├─ hooks/                   Lógica de estado/composição reutilizável, consumindo Services/Contexts
│  ├─ useTransactions.js      porta de entrada para o Context de transações
│  ├─ useTransactionsList.js  busca paginada/filtrada/ordenada do Histórico (não usa o Context)
│  ├─ useCategories.js        porta de entrada para o Context de categorias
│  ├─ useCards.js             porta de entrada para o Context de cartões
│  ├─ useRecurringExpenses.js porta de entrada para recorrências
│  ├─ useDashboard.js         dados prontos + loading/error para a página Dashboard
│  └─ useAnalytics.js         dados prontos + loading/error para a página Análises
│
├─ contexts/                Estado verdadeiramente global
│  ├─ TransactionsContext.jsx  lista agregada (Dashboard/Análises) + mutações + contador `version`
│  ├─ CategoriesContext.jsx    lista de categorias + CRUD — uma só fonte para toda a árvore
│  ├─ CardsContext.jsx         cartões ativos/inativos + CRUD
│  ├─ RecurringExpensesContext.jsx  definições recorrentes + CRUD
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
│  ├─ cards/                  CardForm, CardListItem, CardPaymentForm
│  ├─ recurringExpenses/      RecurringExpenseForm
│  ├─ settings/                SettingsGroup, SettingsRow
│  └─ forms/                  TransactionForm (usado no modal rápido e na página Registrar)
│
├─ layout/                   Casca da aplicação
│  ├─ AppShell.jsx, Sidebar.jsx, BottomNav.jsx, Header.jsx, navItems.js
│
├─ pages/                    Uma página por rota — só orquestram hooks + componentes
│  ├─ Dashboard.jsx  RegisterTransaction.jsx  History.jsx  Analytics.jsx
│  └─ Categories.jsx  Cards.jsx  RecurringExpenses.jsx  Settings.jsx
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

Nenhuma página faz `fetch()`. Nenhum componente conhece uma URL. As mutações
passam pelos Contexts de transações, categorias, cartões e recorrências. O
estado local só é alterado depois de a API confirmar a operação — assim uma
exclusão recusada pelo backend não faz o item desaparecer da interface.

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

---

## Fase 3, Etapa 8 — Cartões e Parcelamentos

### Nova página: Cartões (`/cartoes`)

`pages/Cards.jsx` — listar, criar, editar e excluir cartões. Cartões com
transações ou pagamentos vinculados permanecem visíveis, e a API recusa a
exclusão física em vez de ocultá-los automaticamente.
Segue exatamente o padrão de `pages/Categories.jsx`: `CardsContext` como
fonte única de verdade (mesmo raciocínio do `CategoriesContext` — criar um
cartão no formulário de lançamento precisa refletir na tela de
gerenciamento e vice-versa, sem reload). Adicionada à navegação existente
(`layout/navItems.js`) — `Sidebar` já era genérico o suficiente para
crescer sozinho; `BottomNav` foi generalizado para distribuir N itens em
volta do botão central, em vez de assumir exatamente 5.

### Registro de transação com cartão

`components/forms/TransactionForm.jsx` ganhou uma seção "Forma de
pagamento", visível só para despesa: Dinheiro/Cartão de crédito. Ao
escolher um cartão, aparece a seleção do cartão e a quantidade de parcelas
(campo numérico, 1 a 60). Com mais de 1 parcela, uma prévia informativa
aparece (compra total, valor aproximado por parcela, cartão) — **não**
tenta replicar a regra de ciclo de fatura do backend (fechamento/
vencimento) no cliente: isso duplicaria uma regra de negócio não-trivial em
dois lugares, e o próprio backend é quem calcula as datas definitivas.
Datas exatas só aparecem depois de salvar, vindas da API.

### Contrato de resposta: uma chamada pode criar várias transações

Quando o formulário envia `cardId` + `installmentTotal > 1`, o backend
responde com `{ installmentGroupId, count, transactions: [...] }` em vez de
uma única transação. Normalizado em **um único lugar**
(`TransactionsContext.addTransaction`), que sempre espalha a lista
resultante no estado local — nenhuma página ou componente que chama
`addTransaction` precisa saber dessa diferença.

### Histórico e linha de transação

`components/transactions/TransactionRow.jsx` e as duas visualizações
(cards mobile / tabela desktop) de `pages/History.jsx` agora mostram o
nome do cartão e "N/total" quando a transação pertence a uma compra
parcelada — sem criar uma tela de fatura nova, só uma indicação visual
onde a movimentação já aparecia.

### Arquivos novos

```
src/services/card.service.js
src/contexts/CardsContext.jsx
src/hooks/useCards.js
src/pages/Cards.jsx
src/components/cards/CardForm.jsx
src/components/cards/CardListItem.jsx
src/components/cards/CardPaymentForm.jsx
```

### Fora do escopo desta etapa

Tela de fatura mensal agrupada, edição em lote de um grupo de parcelas,
qualquer cálculo de limite feito no cliente (sempre vem de
`GET /cards/:id/summary`), e prévia de datas de parcelamento no formulário
(deliberadamente simplificada — ver acima).

---

## Fase 3, Etapa 9 — Gastos recorrentes

**Status: concluída.**

`pages/RecurringExpenses.jsx` permite listar, cadastrar, editar e desativar
regras mensais. A tela usa `RecurringExpensesContext`,
`useRecurringExpenses` e `services/recurringExpense.service.js`, mantendo o
mesmo caminho Context → Service → API client das entidades existentes.

Ocorrências retornadas pela API têm `recurringExpenseId`; Histórico e
`TransactionRow` exibem o indicador discreto “Recorrente”, separado de
parcelas. A navegação inclui **Recorrentes**. O Dashboard e as Análises já
consomem transações normais, portanto as ocorrências passam a participar dos
agregados sem um segundo sistema de dados.

### Formulário e gerenciamento

`RecurringExpenseForm` cadastra descrição, valor, categoria de despesa, dia
do mês, início, fim opcional, cartão opcional, observações e atividade. A
tela de gerenciamento inclui regras ativas e inativas. Desativar uma regra
preserva todas as ocorrências já geradas.

### Pagamento manual de fatura

A página de cartões permite registrar pagamento integral ou parcial do
limite em aberto. `card.service.js` envia a quitação para
`POST /cards/:id/payments` e recarrega o resumo calculado no backend. Como a
compra original já é uma despesa, o pagamento apenas libera limite e não
cria uma segunda movimentação financeira.

### Categorias personalizáveis

O formulário de categorias oferece 20 cores predefinidas, 41 ícones e uma
cor personalizada escolhida pelo espectro visual ou por hexadecimal
`#RRGGBB`.

## Deploy e uso mobile

- Produção: [cofre-orcin.vercel.app](https://cofre-orcin.vercel.app)
- API: [cofre-api-mgdl.onrender.com](https://cofre-api-mgdl.onrender.com)

A navegação e os formulários são responsivos para uso pelo Safari no iPhone.
No plano gratuito do Render, a primeira chamada após um período sem uso pode
aguardar a reativação do backend.

## Validação

```bash
npm run lint
npm run build
```

O frontend depende de `VITE_API_URL`. As chamadas HTTP permanecem
centralizadas em `api/client.js` e nos services.
