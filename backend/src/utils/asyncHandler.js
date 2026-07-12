// O Express 5 já encaminha rejeições de handlers async para o error handler
// automaticamente, mas manter esse wrapper explícito documenta a intenção,
// evita depender de um comportamento implícito da versão do framework, e
// funciona igual em qualquer versão do Express.
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

module.exports = asyncHandler
