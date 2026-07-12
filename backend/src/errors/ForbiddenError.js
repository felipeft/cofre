const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

class ForbiddenError extends AppError {
  constructor(message = 'Acesso não permitido.', details = [], code = ERROR_CODES.CORS_NOT_ALLOWED) {
    super(message, { statusCode: HTTP_STATUS.FORBIDDEN, code, details })
  }
}

module.exports = ForbiddenError
