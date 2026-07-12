# Cofre API — Backend (infraestrutura)

Infraestrutura backend do sistema financeiro **Cofre**: Node.js + Express +
SQLite (`better-sqlite3`), sem regras de negócio, autenticação ou CRUD ainda
— só a fundação sobre a qual essas etapas serão construídas.

## Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Não é preciso nenhum passo manual de banco: na primeira execução o SQLite é
criado automaticamente em `src/database/cofre.db` e as migrations pendentes
rodam sozinhas.

## Rotas disponíveis

| Rota | Descrição |
|---|---|
| `GET /` | Informações da API (nome, versão, ambiente) |
| `GET /health` | Health check (status + conexão com o banco) |
| `GET /version` | Versão da aplicação e do Node |
| `GET /status` | Uptime, memória, PID, caminho do banco |

Todas retornam `{ success, data, message }` em caso de sucesso e
`{ success: false, message, code, details }` em caso de erro.

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

Cada camada só conhece a camada imediatamente abaixo. Nenhum controller
executa SQL, nenhuma rota contém lógica — ver a árvore completa e a
justificativa de cada pasta na resposta que acompanha esta entrega.

## Próximas etapas

- CRUD real de categorias/transações (novas migrations em
  `src/database/migrations/`, repositories, services e rotas dedicadas)
- Autenticação Google OAuth (`config.googleAuth`, `config.session` já
  reservados)
- Integração com Google Sheets (`config.googleSheets` já reservado)
- Troca gradual dos mocks do frontend pelos endpoints reais, sem
  reescrever `services/`, `hooks/` ou `pages/` do lado do cliente
