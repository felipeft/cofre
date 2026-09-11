const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')

class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária.', code = 'UNAUTHENTICATED') {
    super(message, { statusCode: HTTP_STATUS.UNAUTHORIZED, code })
  }
}

module.exports = UnauthorizedError
