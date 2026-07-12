const logger = require('../utils/logger')

// Loga início e fim de cada requisição, com duração e status — o mínimo
// necessário para depurar produção sem precisar de um APM.
function requestLogger(req, res, next) {
  const startedAt = Date.now()

  res.on('finish', () => {
    logger.info('request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    })
  })

  next()
}

module.exports = requestLogger
