const { randomUUID } = require('crypto')

// Cada requisição ganha um ID curto, devolvido no header `X-Request-Id` e
// incluído em todo log gerado durante seu ciclo de vida (ver
// requestLogger.middleware.js e errorHandler.middleware.js). Sem isso, dois
// requests concorrentes com erro ao mesmo tempo geram logs impossíveis de
// distinguir.
function requestId(req, res, next) {
  req.id = randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}

module.exports = requestId
