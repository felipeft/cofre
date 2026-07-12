const { getDatabase } = require('./connection')
const { runMigrations } = require('./migrate')
const logger = require('../utils/logger')

/**
 * Chamado uma vez, na inicialização do servidor. Garante que o arquivo do
 * banco existe (criado por `getDatabase`) e que todas as migrations
 * pendentes foram aplicadas — sem precisar de nenhum comando manual antes de
 * `npm run dev` num ambiente novo.
 */
function ensureDatabaseReady() {
  getDatabase()
  const { applied } = runMigrations()

  if (applied.length > 0) {
    logger.info('Banco de dados atualizado na inicialização', { migrations: applied })
  }
}

module.exports = { ensureDatabaseReady }
