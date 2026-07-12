const ValidationError = require('../errors/ValidationError')

/**
 * Fábrica de middleware de validação: `validate(schema, 'query')` valida
 * `req.query` contra um schema Zod, substitui `req.query` pelo dado já
 * parseado/transformado (ex: string → number) e segue adiante. Em caso de
 * falha, gera um `ValidationError` com os detalhes de cada campo — o error
 * handler global cuida do resto.
 */
function validate(schema, source = 'body') {
  return function validationMiddleware(req, res, next) {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return next(new ValidationError('Dados inválidos na requisição.', details))
    }

    req[source] = result.data
    next()
  }
}

module.exports = validate
