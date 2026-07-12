const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

/**
 * Erro base da aplicação. Qualquer erro esperado (validação, não encontrado,
 * falha de banco, etc.) deve estender esta classe em vez de lançar um Error
 * genérico — assim o error handler global sabe exatamente como formatar a
 * resposta e qual status HTTP usar.
 */
class AppError extends Error {
  constructor(message, { statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL_ERROR, details = [] } = {}) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true // erro previsto/tratado, diferente de um bug inesperado

    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError
