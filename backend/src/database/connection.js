const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')
const config = require('../config')
const logger = require('../utils/logger')

let client = null
let database = null

function normalizeArgs(args) {
  if (args.length === 1 && (Array.isArray(args[0]) || (args[0] && typeof args[0] === 'object'))) return args[0]
  return args
}

function createStatement(executor, sql) {
  return {
    async run(...args) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) })
      return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid == null ? null : Number(result.lastInsertRowid) }
    },
    async get(...args) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) })
      return result.rows[0]
    },
    async all(...args) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) })
      return Array.from(result.rows)
    },
  }
}

function facade(executor, ready = Promise.resolve()) {
  return {
    prepare(sql) {
      return createStatement({ execute: async (input) => { await ready; return executor.execute(input) } }, sql)
    },
    async exec(sql) { await ready; return executor.executeMultiple(sql) },
    async batch(statements, mode = 'write') { await ready; return executor.batch(statements, mode) },
    async transaction(callback, mode = 'write') {
      await ready
      const tx = await executor.transaction(mode)
      try {
        const result = await callback(facade(tx))
        await tx.commit()
        return result
      } catch (error) {
        await tx.rollback()
        throw error
      } finally {
        tx.close()
      }
    },
  }
}

function getDatabase() {
  if (database) return database
  const remote = Boolean(config.database.tursoUrl)
  if (!remote) fs.mkdirSync(path.dirname(config.database.path), { recursive: true })
  const url = remote ? config.database.tursoUrl : `file:${config.database.path}`
  client = createClient({
    url,
    authToken: remote ? config.database.tursoAuthToken : undefined,
    intMode: 'number',
    // O Cofre tem baixa concorrência e usa PRAGMAs por conexão. Uma única
    // fila mantém o comportamento previsível entre SQLite local e Turso.
    concurrency: 1,
  })
  const ready = (async () => {
    await client.execute('PRAGMA foreign_keys = ON')
    const result = await client.execute('PRAGMA foreign_keys')
    if (Number(result.rows[0]?.foreign_keys) !== 1) throw new Error('Não foi possível habilitar foreign keys no banco.')
  })()
  database = facade(client, ready)
  logger.info('Conexão com o banco estabelecida', { provider: remote ? 'turso' : 'local' })
  return database
}

async function closeDatabase() {
  if (client) client.close()
  client = null
  database = null
}

module.exports = { getDatabase, closeDatabase }
