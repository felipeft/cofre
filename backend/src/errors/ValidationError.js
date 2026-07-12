const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')

class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', details = []) {
    super(message, { statusCode: HTTP_STATUS.BAD_REQUEST, code: ERROR_CODES.VALIDATION_ERROR, details })
  }
}

module.exports = ValidationError
