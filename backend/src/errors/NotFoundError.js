const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.', details = [], code = ERROR_CODES.NOT_FOUND) {
    super(message, { statusCode: HTTP_STATUS.NOT_FOUND, code, details })
  }
}

module.exports = NotFoundError
