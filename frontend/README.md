# Cofre — Frontend de controle financeiro pessoal

Frontend standalone (sem backend) para registro rápido de movimentações financeiras, construído para complementar — não substituir — sua planilha do Google Sheets. Todos os dados são fictícios (mockados) e vivem em memória + `localStorage`, prontos para serem trocados por chamadas reais a uma API Node.js/SQLite no futuro.

## Como rodar

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção em /dist
npm run preview   # servir o build de produção localmente
```

## Stack

- **React 19 + Vite** — SPA rápida, hot reload
- **Tailwind CSS v4** — design tokens via `@theme` em `src/styles/index.css` (sem `tailwind.config.js`, tudo em CSS)
- **React Router 7** — navegação entre páginas
- **Recharts** — gráficos (pizza, barras, área)
- **Lucide React** — ícones (nunca emojis)

## Identidade visual

- Fundo quase preto (`#0a0a0b`) com camadas de cinza (`surface`, `surface-2`, `surface-3`) para hierarquia sem contraste agressivo.
- Cor só aparece com propósito: verde (`income`) para receitas, vermelho (`expense`) para despesas, azul (`info`) para informações e laranja (`alert`) reservado para alertas futuros.
- Tipografia dupla: **Inter** para toda a interface e **JetBrains Mono** (classe utilitária `.num`) exclusivamente para valores monetários — como um livro-caixa, todo número fica alinhado e com largura fixa, o que reforça a seriedade financeira do produto sem parecer bancário/corporativo.
- Navegação adaptada ao contexto: sidebar recolhível no desktop, bottom navigation com botão central de ação rápida (+) no mobile — pensada para registrar um gasto em poucos toques.

## Árvore de pastas (`src/`)

```
src/
├─ App.jsx                     # Define as rotas e envolve a app nos providers globais
├─ main.jsx                    # Ponto de entrada React
├─ styles/index.css            # Design tokens (@theme), estilos base e keyframes
│
├─ components/
│  ├─ ui/                      # Design system puro, sem regra de negócio
│  │  ├─ Button.jsx            # Variantes: primary, secondary, ghost, danger
│  │  ├─ Input.jsx  Select.jsx           # campos de formulário padronizados
│  │  ├─ Card.jsx   Badge.jsx            # superfícies e rótulos
│  │  ├─ Modal.jsx  Dialog.jsx           # modal base + confirmação de exclusão
│  │  ├─ Toast.jsx  Loading.jsx          # feedback e estados de carregamento
│  │  ├─ EmptyState.jsx                  # telas vazias com convite à ação
│  │  └─ CategoryIcon.jsx                # resolve nome de ícone → componente Lucide
│  │
│  ├─ layout/                  # Casca da aplicação (shell)
│  │  ├─ AppShell.jsx           — combina Sidebar + BottomNav + modal global de registro rápido
│  │  ├─ Sidebar.jsx            — navegação recolhível para desktop
│  │  ├─ BottomNav.jsx          — navegação + botão de ação rápida para mobile
│  │  ├─ Header.jsx             — cabeçalho de página (título/subtítulo/ações)
│  │  └─ navItems.js            — fonte única da lista de navegação
│  │
│  ├─ charts/                  # Wrappers do Recharts já estilizados com os tokens do tema
│  │  └─ CategoryPieChart.jsx  MonthlyBarChart.jsx  TrendLineChart.jsx
│  │
│  ├─ dashboard/StatCard.jsx    # Card flutuante de estatística (saldo/receita/despesa)
│  ├─ transactions/TransactionRow.jsx  # Linha de lançamento reutilizada no Dashboard/Histórico
│  └─ forms/TransactionForm.jsx # Formulário único de lançamento, usado no modal E na página dedicada
│
├─ pages/                      # Uma página por rota, compõem os componentes acima
│  ├─ Dashboard.jsx             # "/"              resumo do mês, atalhos, gráficos
│  ├─ RegisterTransaction.jsx   # "/registrar"     versão em página cheia do formulário rápido
│  ├─ History.jsx               # "/historico"     busca, filtros, ordenação, editar/excluir
│  ├─ Analytics.jsx             # "/analitico"     pizza, barras, linha, maiores gastos
│  ├─ Categories.jsx            # "/categorias"    CRUD mockado de categorias
│  └─ Settings.jsx              # "/configuracoes" apenas interface, nada funcional
│
├─ context/
│  ├─ TransactionsContext.jsx  # Estado global das movimentações (mock) + persistência local
│  └─ ToastContext.jsx         # Fila de notificações toast
│
├─ services/
│  ├─ mockCategories.js        # Categorias fictícias (nome, ícone, cor, tipo)
│  └─ mockTransactions.js      # Gerador determinístico de ~6 meses de lançamentos fictícios
│
└─ utils/
   ├─ formatters.js            # Formatação de moeda (BRL) e datas em pt-BR
   └─ aggregations.js          # Cálculos derivados: saldo do mês, breakdown por categoria,
                                  evolução mensal, maiores gastos — usados por Dashboard e Analytics
```

## Por que essa arquitetura facilita a integração futura com o backend

- **`services/`** concentra tudo que hoje é mock. Quando o backend em Node.js/SQLite existir, essas funções viram chamadas `fetch`/`axios` sem que nenhuma página precise mudar.
- **`context/TransactionsContext.jsx`** já expõe `addTransaction`, `updateTransaction` e `deleteTransaction` como uma API estável — trocar o armazenamento local por chamadas HTTP é uma mudança isolada nesse arquivo.
- **`utils/aggregations.js`** mantém toda lógica de cálculo fora dos componentes visuais, então mesmo que os totais passem a vir prontos da API, as páginas continuam consumindo a mesma interface de dados.
- **`components/ui/`** não conhece regra de negócio nenhuma — é o design system puro, reaproveitável em qualquer tela nova.

## Observações

- `cursor.js` do seu portfólio não faz parte deste projeto (é uma aplicação separada); nada aqui interfere nele.
- Sem backend, os dados vivem em `localStorage` sob a chave `cofre:transactions`, então lançamentos criados/editados/excluídos persistem entre recarregamentos do navegador, mas não são compartilhados entre dispositivos.
