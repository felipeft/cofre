const ValidationError = require('../errors/ValidationError')

/**
 * Fábrica de middleware de validação: `validate(schema, 'query')` valida
 * `req.query` contra um schema Zod e disponibiliza o resultado (já
 * parseado/transformado — ex: string → number, aplicando defaults) em
 * `req.validated.query`. Em caso de falha, gera um `ValidationError` com os
 * detalhes de cada campo — o error handler global cuida do resto.
 *
 * Guarda em `req.validated[source]` em vez de reatribuir `req[source]`
 * diretamente: no Express 5, `req.query` é uma propriedade só com getter, e
 * `req.query = valor` falha silenciosamente (não lança erro, mas também não
 * atualiza nada) — dependeríamos de um comportamento que não existe mais.
 * `req.body` e `req.params` continuam graváveis, mas usar sempre o mesmo
 * padrão evita ter duas convenções diferentes dependendo da origem do dado.
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

    req.validated = req.validated ?? {}
    req.validated[source] = result.data
    next()
  }
}

module.exports = validate
