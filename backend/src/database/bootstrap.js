const { getDatabase } = require('./connection')
const { runMigrations } = require('./migrate')
const logger = require('../utils/logger')

/**
 * Chamado uma vez, na inicialização do servidor. Garante que o banco local
 * ou remoto está acessível e que todas as migrations
 * pendentes foram aplicadas — sem precisar de nenhum comando manual antes de
 * `npm run dev` num ambiente novo.
 */
async function ensureDatabaseReady() {
  getDatabase()
  const { applied } = await runMigrations()

  if (applied.length > 0) {
    logger.info('Banco de dados atualizado na inicialização', { migrations: applied })
  }
  // Recorrências agora são conciliadas por usuário autenticado, no acesso
  // às rotas de negócio; o bootstrap não possui identidade de usuário.
}

module.exports = { ensureDatabaseReady }
