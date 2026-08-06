# Cofre API — Backend

API do sistema financeiro **Cofre**: Node.js + Express + SQLite
(`better-sqlite3`). CRUD completo de categorias e transações, sem
autenticação ainda — isso fica para uma etapa futura.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Não é preciso nenhum passo manual de banco: na primeira execução o SQLite é
criado automaticamente em `src/database/cofre.db` e as migrations pendentes
rodam sozinhas (categorias e transações incluídas).

## Rotas

| Rota | Descrição |
|---|---|
| `GET /`, `/health`, `/version`, `/status` | Infraestrutura |
| `GET /categories` | Lista categorias — `?type=income\|expense`, `?includeInactive=true` |
| `GET /categories/:id` | Busca uma categoria |
| `POST /categories` | Cria categoria — `{ name, type, color, icon, isActive?, sortOrder? }` |
| `PUT /categories/:id` | Atualiza (parcial) |
| `DELETE /categories/:id` | Exclui — vira desativação lógica se houver transações associadas |
| `GET /transactions` | Lista paginada — ver query params abaixo |
| `GET /transactions/:id` | Busca uma transação (com categoria já populada) |
| `POST /transactions` | Cria — `{ description?, amount, type, categoryId, date, notes?, tags?, ... }` |
| `PUT /transactions/:id` | Atualiza (parcial) |
| `DELETE /transactions/:id` | Exclui |

**Query params de `GET /transactions`:** `page`, `limit`, `q` (busca em
descrição/categoria/observações), `type`, `categoryId`, `month`, `year`,
`dateFrom`, `dateTo`, `status`, `sortBy` (`date\|amount\|description\|category\|createdAt`), `sortDir` (`asc\|desc`).

Toda resposta segue `{ success, data, message }` (+ `meta` com
`page/limit/total/totalPages` nas listagens paginadas); erros seguem
`{ success: false, message, code, details }`.

## Scripts

```bash
npm run dev       # nodemon, com reload automático
npm run start     # produção, sem reload
npm run migrate   # aplica migrations pendentes manualmente
npm run seed      # roda seeds (nenhum registrado ainda)
```

## Arquitetura

```
Routes → Controllers → Services → Repositories → SQLite
```

Cada camada só conhece a camada imediatamente abaixo. Repositories só
executam SQL; regras de negócio (duplicidade, exclusão lógica, consistência
categoria↔tipo, derivação de competência) vivem inteiramente nos services.

## Notas de implementação

- **CORS multi-origem**: `FRONTEND_URLS` no `.env` aceita uma lista separada
  por vírgula; `config.cors.allowedOrigins` é a única fonte consultada pelo
  middleware — nenhuma URL fixa em código. Origin fora da lista responde
  `403`/`CORS_NOT_ALLOWED` no formato padrão da API; requisições sem header
  `Origin` (curl, Postman, health checks) sempre passam.
- **Express 5**: `req.query` é uma propriedade somente-leitura nessa versão
  — reatribuí-la falha silenciosamente. `validate.middleware.js` guarda o
  resultado já validado/coercionado em `req.validated[source]`
  (`body`/`query`/`params`), e todos os controllers leem daí.
- **Schemas de criação vs. atualização são definidos separadamente**: um
  `.default()` sobrevive a `.partial()`, então um schema de update derivado
  de `.partial()` do schema de criação faria um `PUT` com corpo vazio
  reescrever campos com seus valores padrão em vez de ser rejeitado. Os
  schemas de update (`updateCategorySchema`, `updateTransactionSchema`) são
  compostos a partir dos mesmos validadores "puros", sem nenhum `.default()`.

## Próximas etapas

- Autenticação Google OAuth (`config.googleAuth`, `config.session` já
  reservados)
- Integração com Google Sheets (`config.googleSheets` já reservado)
- Dashboard/Analytics consumindo os mesmos repositories já existentes
- Troca gradual dos mocks do frontend pelos endpoints reais, sem
  reescrever `services/`, `hooks/` ou `pages/` do lado do cliente
