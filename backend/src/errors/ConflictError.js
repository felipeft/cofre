const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

class ConflictError extends AppError {
  constructor(message = 'Conflito com o estado atual do recurso.', details = [], code = ERROR_CODES.CONFLICT) {
    super(message, { statusCode: HTTP_STATUS.CONFLICT, code, details })
  }
}

module.exports = ConflictError
