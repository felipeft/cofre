const fs = require('fs')
const path = require('path')
const { getDatabase } = require('./connection')
const logger = require('../utils/logger')

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

/**
 * Garante que a tabela de controle de migrations existe. Isso não é uma
 * "migration de negócio" — é a infraestrutura que permite rastrear quais
 * migrations já rodaram, então é criada diretamente aqui em vez de como um
 * arquivo numerado em `migrations/`.
 */
function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function getAppliedMigrations(db) {
  const rows = db.prepare('SELECT name FROM schema_migrations ORDER BY id ASC').all()
  return new Set(rows.map((row) => row.name))
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort() // nomes começam com número (0001_, 0002_...), então a ordem alfabética já é a ordem correta
}

/**
 * Aplica todas as migrations pendentes, em ordem, cada uma dentro de sua
 * própria transação. Idempotente: rodar de novo com nada pendente não faz
 * nada. Usada tanto pelo bootstrap automático do servidor quanto pelo script
 * `npm run migrate`.
 */
function runMigrations() {
  const db = getDatabase()
  ensureMigrationsTable(db)

  const applied = getAppliedMigrations(db)
  const files = getMigrationFiles()
  const pending = files.filter((file) => !applied.has(file))

  if (pending.length === 0) {
    logger.info('Nenhuma migration pendente.')
    return { applied: [] }
  }

  const appliedNow = []

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(filePath, 'utf-8')

    const runMigration = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file)
    })

    runMigration()
    appliedNow.push(file)
    logger.info('Migration aplicada', { file })
  }

  return { applied: appliedNow }
}

module.exports = { runMigrations, ensureMigrationsTable, getMigrationFiles }

// Permite `node src/database/migrate.js` (usado pelo script `npm run migrate`)
// além de ser importado programaticamente pelo bootstrap do servidor.
if (require.main === module) {
  try {
    const result = runMigrations()
    logger.info('Migrations concluídas', { count: result.applied.length })
    process.exit(0)
  } catch (err) {
    logger.error('Falha ao rodar migrations', { error: err.message })
    process.exit(1)
  }
}
