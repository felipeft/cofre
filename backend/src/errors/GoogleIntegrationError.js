const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')

class GoogleIntegrationError extends AppError {
  constructor(message, { code = 'GOOGLE_INTEGRATION_ERROR', statusCode = HTTP_STATUS.BAD_GATEWAY || 502, details = [] } = {}) {
    super(message, { statusCode, code, details })
  }
}

module.exports = GoogleIntegrationError
