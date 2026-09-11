const authService = require('../services/auth.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const config = require('../config')
const { parseCookies, serializeCookie } = require('../utils/cookies')

const google = asyncHandler(async (req, res) => {
  const login = await authService.beginGoogleLogin()
  res.setHeader('Set-Cookie', serializeCookie(authService.STATE_COOKIE_NAME, login.stateCookie, authService.getStateCookieSettings()))
  res.redirect(login.authorizationUrl)
})

const callback = asyncHandler(async (req, res) => {
  const clearState = serializeCookie(authService.STATE_COOKIE_NAME, '', { ...authService.getStateCookieSettings(), maxAge: 0 })
  try {
    if (req.query.error) throw new Error('Login cancelado no Google.')
    const cookies = parseCookies(req.headers.cookie)
    const result = await authService.completeGoogleLogin({ code: req.query.code, state: req.query.state, stateCookie: cookies[authService.STATE_COOKIE_NAME] })
    const sessionCookie = serializeCookie(config.session.cookieName, result.sessionToken, authService.getCookieSettings())
    res.setHeader('Set-Cookie', [clearState, sessionCookie])
    return res.redirect(result.redirectUrl)
  } catch (error) {
    res.setHeader('Set-Cookie', clearState)
    const reason = error.code === 'AUTH_NOT_ALLOWED' ? 'not_allowed' : 'failed'
    return res.redirect(`${authService.getFrontendUrl()}/?auth_error=${reason}`)
  }
})

const me = asyncHandler(async (req, res) => {
  const token = parseCookies(req.headers.cookie)[config.session.cookieName]
  const user = await authService.getAuthenticatedUser(token)
  apiResponse.success(res, { data: { authenticated: Boolean(user), user } })
})

const logout = asyncHandler(async (req, res) => {
  const token = parseCookies(req.headers.cookie)[config.session.cookieName]
  await authService.logout(token)
  res.setHeader('Set-Cookie', serializeCookie(config.session.cookieName, '', { ...authService.getCookieSettings(), maxAge: 0 }))
  apiResponse.success(res, { data: null, message: 'Sessão encerrada com sucesso.' })
})

module.exports = { google, callback, me, logout }
