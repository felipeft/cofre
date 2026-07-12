const NotFoundError = require('../errors/NotFoundError')
const ERROR_CODES = require('../constants/errorCodes')

// Fica montado depois de todas as rotas. Qualquer requisição que chegou até
// aqui não bateu em nenhuma rota registrada, então vira um erro padronizado
// em vez do HTML de erro default do Express.
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Rota ${req.method} ${req.originalUrl} não existe.`, [], ERROR_CODES.ROUTE_NOT_FOUND))
}

module.exports = notFoundHandler
