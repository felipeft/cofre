const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

class DatabaseError extends AppError {
  constructor(message = 'Falha ao acessar o banco de dados.', details = []) {
    super(message, { statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE, code: ERROR_CODES.DATABASE_ERROR, details })
  }
}

module.exports = DatabaseError
