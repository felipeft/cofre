const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

/**
 * Repository não tem "regra de negócio" — só sabe conversar com o SQLite.
 * Nesta etapa existe apenas para provar que a camada está no lugar certo e
 * para dar ao /health uma forma real de checar a conexão com o banco.
 * Repositories futuros (CategoryRepository, TransactionRepository...)
 * seguem o mesmo padrão: métodos pequenos, uma responsabilidade, erros
 * inesperados sempre traduzidos para `DatabaseError`.
 */
function ping() {
  try {
    const db = getDatabase()
    const row = db.prepare('SELECT 1 AS ok').get()
    return row?.ok === 1
  } catch (err) {
    throw new DatabaseError('Não foi possível consultar o banco de dados.', [err.message])
  }
}

module.exports = { ping }
