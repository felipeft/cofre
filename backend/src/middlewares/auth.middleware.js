const config = require('../config')
const authService = require('../services/auth.service')
const { parseCookies } = require('../utils/cookies')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ForbiddenError = require('../errors/ForbiddenError')

function sessionToken(req) { return parseCookies(req.headers.cookie)[config.session.cookieName] }

async function requireAuth(req, res, next) {
  const user = await authService.getAuthenticatedUser(sessionToken(req))
  if (!user) return next(new UnauthorizedError())
  req.user = user
  next()
}

function protectAgainstCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (origin && !config.cors.allowedOrigins.includes(origin)) return next(new ForbiddenError('Origem inválida para esta operação.', [], 'CSRF_REJECTED'))
  next()
}

module.exports = { requireAuth, protectAgainstCsrf, sessionToken }
