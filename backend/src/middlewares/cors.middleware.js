const cors = require('cors')
const config = require('../config')
const ForbiddenError = require('../errors/ForbiddenError')

// Só as origins listadas em config.cors.allowedOrigins (vindas de
// FRONTEND_URLS) podem chamar a API. Nada fixo aqui: a lista é montada uma
// única vez, na inicialização, a partir de config — trocar/adicionar uma
// origin é mudar o .env, nunca este arquivo.
//
// `origin` como função (em vez de string/array direto) porque precisamos
// aceitar requisições sem header Origin — Postman, curl, health checks e
// chamadas server-to-server não enviam esse header, e a lib `cors` trata
// `origin: undefined` como "não é uma requisição cross-origin", não como
// "origin não permitida".
function resolveOrigin(requestOrigin, callback) {
  if (!requestOrigin || config.cors.allowedOrigins.includes(requestOrigin)) {
    return callback(null, true)
  }

  // Erro passado ao callback do `cors` vira `next(err)` internamente, então
  // usar nosso ForbiddenError aqui (em vez de um Error genérico) já garante
  // um 403 no formato padronizado, tratado pelo errorHandler global como
  // qualquer outro erro esperado da aplicação.
  return callback(new ForbiddenError(`Origin não permitida pelo CORS: ${requestOrigin}`))
}

// Este backend vai lidar com cookies de sessão HTTP-only na etapa de
// autenticação, e cookies cross-origin exigem uma origin explícita —
// `credentials: true` já deixa isso pronto.
const corsMiddleware = cors({
  origin: resolveOrigin,
  credentials: true,
})

module.exports = corsMiddleware
