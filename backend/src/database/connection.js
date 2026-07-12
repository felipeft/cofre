const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const config = require('../config')
const logger = require('../utils/logger')

let db = null

/**
 * Retorna a instância singleton do banco. Cria o diretório do arquivo
 * .db automaticamente se ainda não existir — não é preciso rodar nenhum
 * comando manual antes do primeiro `npm run dev`.
 */
function getDatabase() {
  if (db) return db

  const dbDir = path.dirname(config.database.path)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(config.database.path)

  // WAL costuma ser a escolha certa mesmo para um app de usuário único:
  // permite leituras concorrentes durante uma escrita e é mais resiliente a
  // uma queda de energia no meio de uma transação do que o modo padrão.
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  logger.info('Conexão com o banco estabelecida', { path: config.database.path })

  return db
}

function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getDatabase, closeDatabase }
