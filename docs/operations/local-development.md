# Desenvolvimento local

## Pré-requisitos

- Node.js `22.x`, conforme `backend/.node-version` e `engines.node`;
- npm compatível com o Node 22;
- Git;
- para a aplicação completa, um cliente OAuth Web do Google com callbacks locais;
- nenhuma conta externa é necessária para executar a Demo.

O repositório não possui `package.json` na raiz. Instalação e comandos devem ser
executados dentro de `backend/` ou `frontend/`.

## Demo local

Execute a partir da raiz clonada:

```bash
cd frontend
npm ci
VITE_APP_MODE=demo npm run dev
```

Acesse `http://localhost:5173`. O modo Demo não inicia login, não exige backend e
persiste o seed e as alterações na chave `cofre:demo:v1` do navegador.

Não deixe `VITE_API_URL` definido no ambiente nem em um `.env` carregado pelo
Vite. O build/dev Demo falha deliberadamente quando essa variável existe. O botão
“Resetar demonstração” remove somente o namespace do Cofre Demo e recria o seed;
ele não deve ser substituído por `localStorage.clear()`.

## Aplicação completa

Prepare o backend, dentro de `backend/`:

```bash
cp .env.example .env
npm ci
npm run dev
```

Prepare o frontend em outro terminal, dentro de `frontend/`:

```bash
cp .env.example .env
npm ci
npm run dev
```

Com os defaults atuais:

- frontend: `http://localhost:5173`;
- backend: `http://localhost:3000`;
- proxy do Vite: `/api/*` para `http://localhost:3000/*`;
- banco: `backend/src/database/cofre.db`, porque `DATABASE_PATH` é resolvido a
  partir do diretório de execução do backend.

Execute o backend a partir de `backend/`. Rodá-lo de outro diretório muda a base
de resolução de `DATABASE_PATH`.

Para testar autenticação e Sheets localmente, os callbacks cadastrados no cliente
OAuth e no `.env` precisam coincidir exatamente com:

```text
http://localhost:5173/api/auth/google/callback
http://localhost:5173/api/integrations/google-sheets/callback
```

Os dois passam pelo proxy do Vite antes de alcançar as rotas do backend.

## Bootstrap e migrations

`npm run dev` e `npm start` chamam o mesmo bootstrap. A sequência é:

```text
validar ambiente → abrir libSQL → habilitar foreign keys → aplicar migrations → ouvir PORT
```

Se conexão ou migration falhar, o processo termina com código diferente de zero e
não começa a atender requisições. Também é possível executar somente o migrator:

```bash
cd backend
npm run migrate
```

O comando cria `schema_migrations`, compara seus nomes com os arquivos `.sql` e
aplica apenas os pendentes. Cada arquivo e seu registro são gravados na mesma
transação. A execução sem pendências é idempotente e registra
`Nenhuma migration pendente.`.

Para verificar o estado sem alterar o banco, consulte com uma ferramenta SQL
autorizada:

```sql
SELECT id, name, applied_at
FROM schema_migrations
ORDER BY id;
```

O repositório contém atualmente as migrations `0001` a `0015`. Detalhes e limites
do migrator estão em [Migrations e evolução do schema](../database/migrations.md).

## Fluxo normal de desenvolvimento

1. Suba backend e frontend com os comandos acima.
2. Faça a mudança na camada responsável.
3. Execute testes do backend quando tocar API, domínio, banco ou integração.
4. Execute lint, teste Demo e o build correspondente quando tocar frontend.
5. Não edite migrations já aplicadas; crie uma nova migration sequencial.
6. Não use dados, tokens ou banco de Production nos testes.

Comandos de validação:

```bash
# dentro de backend/
npm test
npm run openapi:validate
```

```bash
# dentro de frontend/
npm run lint
npm run test:demo
npm run build
```

Para validar o artefato isolado da Demo, em um ambiente sem `VITE_API_URL`:

```bash
# dentro de frontend/
npm run build:demo
```

`npm run seed` existe no backend, mas o registro de seeds está vazio. O comando
atual apenas informa que nenhum seed foi registrado e não cria dados de negócio.

