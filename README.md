# Cofre

Aplicação pessoal e familiar de controle financeiro, criada para substituir
gradualmente uma planilha de uso cotidiano por um sistema estruturado,
confiável e preparado para evoluir com autenticação, integração ao Google
Sheets, inteligência financeira, Engenharia de Dados e IA.

> **Status atual:** Fase 5 em andamento — Fase 4 concluída; Etapa 12 Google
> Sheets implementada e testada localmente, aguardando validação com as APIs
> Google em produção.

## Acesso

- Frontend: [cofre-orcin.vercel.app](https://cofre-orcin.vercel.app)
- API: [cofre-api-mgdl.onrender.com](https://cofre-api-mgdl.onrender.com)

O frontend está hospedado na Vercel e o backend no Render. A interface é
responsiva e destinada também ao uso diário pelo Safari no iPhone. Como o
backend utiliza o plano gratuito do Render, a primeira requisição após um
período sem uso pode levar alguns segundos enquanto o serviço é reativado.

## Funcionalidades atuais

- Cadastro, edição, consulta e exclusão de receitas e despesas.
- Categorias de receita e despesa com cores e ícones personalizáveis.
- Pesquisa, filtros, paginação e ordenação do histórico.
- Competência financeira separada da data do lançamento.
- Dashboard e análises por período e categoria.
- Regras parametrizadas de oferta e dízimo para categorias de receita.
- Snapshot das regras financeiras aplicadas, preservando o histórico.
- Cartões de crédito com limite, fechamento e vencimento.
- Compras parceladas com geração atômica das parcelas e ajuste de centavos.
- Gastos recorrentes mensais, com data inicial/final e cartão opcional.
- Geração automática e idempotente das ocorrências recorrentes.
- Pagamento manual de fatura para liberar o limite comprometido.
- Interface responsiva para desktop e dispositivos móveis.
- Login Google com whitelist de e-mails e sessão persistente HTTP-only.
- Isolamento dos dados financeiros por usuário autenticado.
- Perfil com nome preferido no Cofre e identidade Google preservada.
- Preferências financeiras individuais de oferta e dízimo.
- Área de configurações com dados seguros da conta e da sessão atual.
- Integração Google Sheets opcional por usuário, com exportação e importação
  manuais, planilha anual padronizada e refresh token criptografado.

## Regras importantes do domínio

### Histórico financeiro

Transações representam fatos financeiros. Alterar uma categoria, uma taxa ou
uma definição recorrente não reescreve silenciosamente ocorrências já
registradas.

### Oferta e dízimo

As regras são propriedades das categorias de receita, nunca nomes
hardcoded. Uma taxa específica da categoria prevalece sobre a preferência
do usuário, que por sua vez usa o default seguro do sistema como fallback.
Os valores e as taxas efetivamente aplicadas são armazenados na transação
para auditoria histórica, portanto mudanças futuras não alteram receitas
anteriores.

### Parcelamento e recorrência

Parcelamento representa uma única compra dividida em parcelas finitas. As
parcelas compartilham um `installment_group_id`.

Recorrência representa uma regra que gera novos fatos financeiros a cada
mês. Cada ocorrência é uma transação independente, vinculada por
`recurring_expense_id`, sem utilizar os campos de parcelamento.

### Cartões e pagamento de fatura

Compras e ocorrências recorrentes vinculadas a um cartão comprometem seu
limite. A compra já é contabilizada como despesa; por isso o pagamento da
fatura é registrado separadamente em `credit_card_payments` e apenas libera
o limite, sem criar uma segunda despesa.

Cartões e categorias sem vínculos podem ser excluídos fisicamente. Quando há
transações associadas, a API recusa a exclusão para não apagar ou ocultar o
histórico. Gastos recorrentes são encerrados por desativação explícita, e
suas ocorrências anteriores permanecem intactas.

## Stack

### Backend

- Node.js 22.x
- Express 5
- libSQL (`@libsql/client`)
- Turso em produção e arquivo SQLite/libSQL no desenvolvimento
- Zod
- dotenv
- migrations SQL
- Node Test Runner

### Frontend

- React 19
- Vite
- Tailwind CSS 4
- React Router
- lucide-react
- Recharts

### Infraestrutura

- GitHub
- Vercel para o frontend
- Render para o backend
- Turso para persistência do banco

## Arquitetura

O projeto mantém regras de negócio fora das bordas HTTP e da persistência.

```text
Frontend
Page → Hook/Context → Service → API Client → HTTP

Backend
Route → Validation/Auth → Controller → Service → Domain/Repository → libSQL/Turso
                                             ↓
                                           Mapper
```

Estrutura principal:

```text
.
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── database/
│   │   │   └── migrations/
│   │   ├── domain/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
└── frontend/
    └── src/
        ├── api/
        ├── components/
        ├── contexts/
        ├── hooks/
        ├── layout/
        ├── pages/
        ├── services/
        └── utils/
```

## Banco de dados

O banco libSQL é a fonte oficial dos dados. Em produção ele fica no Turso;
localmente, o mesmo client usa um arquivo SQLite. Foreign keys são habilitadas
na conexão e as migrations são executadas automaticamente no bootstrap.
As migrations são incrementais, executadas automaticamente no bootstrap e
registradas em `schema_migrations`.

Entidades atuais:

- `categories`
- `transactions`
- `credit_cards`
- `recurring_expenses`
- `credit_card_payments`
- `users`
- `sessions`
- `oauth_login_attempts`

O banco de desenvolvimento está atualmente vazio, mantendo apenas sua
estrutura e o histórico das migrations.

## Executando localmente

Requisito: **Node.js 22.x**.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

A API fica disponível, por padrão, em `http://localhost:3000`. O bootstrap
abre o banco local e executa todas as migrations pendentes automaticamente.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

O frontend fica disponível, por padrão, em `http://localhost:5173`.

## Variáveis de ambiente

Backend:

```env
NODE_ENV=development
PORT=3000
DATABASE_PATH=src/database/cofre.db
FRONTEND_URLS=http://localhost:5173
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback
AUTH_ALLOWED_EMAILS=felipeflw11@gmail.com
AUTH_LEGACY_OWNER_EMAIL=felipeflw11@gmail.com
SESSION_SECRET=
```

Frontend:

```env
VITE_API_URL=/api
```

Em produção, `FRONTEND_URLS` aceita múltiplas origens separadas por vírgula.

## Testes e build

```bash
cd backend
npm test
```

A suíte contém testes unitários para o domínio e testes de integração com
SQLite temporário, incluindo regras financeiras, cartões, parcelamentos,
recorrências, idempotência, pagamentos de fatura e exclusões.

```bash
cd frontend
npm run lint
npm run build
```

## API atual

Principais grupos de endpoints:

- `/`, `/health`, `/version`, `/status`
- `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`
- `/categories`
- `/transactions`
- `/transactions/summary`
- `/cards`
- `/cards/:id/summary`
- `/cards/:id/payments`
- `/recurring-expenses`

Respostas de sucesso seguem `{ success, data, message, meta? }`. Erros seguem
`{ success: false, message, code, details }`.

## Deploy

O fluxo atual é baseado nos commits enviados ao GitHub:

```text
GitHub
├── Vercel → frontend
├── Render → backend
└── Turso → banco libSQL persistente
```

Antes de publicar uma etapa:

1. executar a suíte completa do backend com Node 22;
2. executar lint e build do frontend;
3. confirmar migrations em banco novo e banco existente;
4. validar CORS entre Vercel e Render;
5. validar o fluxo principal no Safari do iPhone.

O banco não depende do filesystem efêmero do Render: schema, dados e sessões
persistentes ficam no Turso.

## Roadmap

Concluído:

- Fase 1 — Fundação da Aplicação.
- Fase 2 — Núcleo Financeiro.
- Fase 3 — Regras Financeiras, incluindo cartões, parcelamentos e gastos
  recorrentes.
- Fase 4 — Google OAuth, sessões persistentes e configurações individuais.

Em andamento:

- Fase 5, Etapa 12 — fundação Google Sheets, exportação e importação manuais;
  falta validar consentimento, criação e operações na API real em produção.

Concluído e validado em produção:

- Fase 4, Etapa 10 — Google OAuth, whitelist, sessões persistentes, Turso e
  isolamento por usuário, incluindo uso no Chrome e Safari do iPhone.
- Fase 4, Etapa 11 — perfil, settings e preferências financeiras por usuário.

Próximas fases planejadas, ainda não iniciadas:

1. Fase 5, Etapa 13 — sistema de sincronização.
2. Fase 6 — Documentação e Engenharia de Software.
3. Fase 7 — Inteligência Financeira.
4. Fase 8 — Engenharia de Dados.
5. Fase 9 — Inteligência Artificial e Machine Learning.
6. Fase 10 — Polimento, containerização e CI/CD.

O marco definido para o início do uso real completo é a conclusão da Etapa
13, após autenticação e sincronização com Google Sheets. Nenhuma etapa futura
foi antecipada nesta atualização.

## Documentação complementar

- [Contexto técnico](PROJECT_CONTEXT.md)
- [Regras de domínio](DOMAIN_RULES.md)
- [Mapa de arquitetura](ARCHITECTURE_MAP.md)
- [Backend](backend/README.md)
- [Frontend](frontend/README.md)
