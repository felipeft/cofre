const AppError = require('../errors/AppError')
const HTTP_STATUS = require('../constants/httpStatus')
const ERROR_CODES = require('../constants/errorCodes')
const apiResponse = require('../utils/apiResponse')
const logger = require('../utils/logger')
const config = require('../config')

// Precisa dos 4 parâmetros (mesmo sem usar `next`) — é assim que o Express
// reconhece um error handler. Montado por último em app.js: qualquer
// `next(err)` de qualquer middleware/controller termina aqui.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isKnownError = err instanceof AppError

  const statusCode = isKnownError ? err.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR
  const code = isKnownError ? err.code : ERROR_CODES.INTERNAL_ERROR
  const details = isKnownError ? err.details : []

  // Erros não previstos (bugs) são logados como `error`; erros operacionais
  // esperados (validação, 404) como `warn` — não deveriam disparar alerta de
  // produção do mesmo jeito que uma exceção real.
  logger[isKnownError ? 'warn' : 'error']('request_error', {
    requestId: req.id,
    path: req.originalUrl,
    statusCode,
    code,
    message: err.message,
    stack: config.isProduction ? undefined : err.stack,
  })

  const message = isKnownError || !config.isProduction ? err.message : 'Erro interno do servidor.'

  return apiResponse.error(res, { message, code, details, statusCode })
}

module.exports = errorHandler
