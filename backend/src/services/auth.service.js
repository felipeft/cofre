const crypto = require('crypto')
const config = require('../config')
const authRepository = require('../repositories/auth.repository')
const defaultGoogleProvider = require('./googleOAuth.service')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ForbiddenError = require('../errors/ForbiddenError')

const STATE_TTL_SECONDS = 10 * 60
const STATE_COOKIE_NAME = 'cofre_oauth_state'
let googleProvider = defaultGoogleProvider

function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url') }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function sqlDate(date) { return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function sessionTtlSeconds() { return config.session.ttlDays * 24 * 60 * 60 }
function frontendUrl() { return config.googleAuth.callbackUrl ? new URL(config.googleAuth.callbackUrl).origin : config.cors.allowedOrigins[0] }

function cookieSignature(value) {
  if (!config.session.secret) throw new Error('SESSION_SECRET não configurado.')
  return crypto.createHmac('sha256', config.session.secret).update(value).digest('base64url')
}

function signState(value) { return `${value}.${cookieSignature(value)}` }
function verifySignedState(signedValue, expectedValue) {
  if (!signedValue || !expectedValue) return false
  const separator = signedValue.lastIndexOf('.')
  if (separator < 1) return false
  const value = signedValue.slice(0, separator)
  const received = Buffer.from(signedValue.slice(separator + 1))
  const expected = Buffer.from(cookieSignature(value))
  return value === expectedValue && received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

function isAllowed(email) { return config.googleAuth.allowedEmails.includes(normalizeEmail(email)) }
function mapUser(row) { return { id: row.user_id ?? row.id, email: row.email, name: row.name, avatarUrl: row.avatar_url ?? null } }

async function beginGoogleLogin() {
  const state = randomToken()
  const nonce = randomToken()
  const codeVerifier = randomToken(48)
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  await authRepository.createLoginAttempt({
    stateHash: hash(state), nonce, codeVerifier,
    expiresAt: sqlDate(new Date(Date.now() + STATE_TTL_SECONDS * 1000)),
  })
  return {
    authorizationUrl: googleProvider.createAuthorizationUrl({ state, nonce, codeChallenge }),
    stateCookie: signState(state),
  }
}

async function completeGoogleLogin({ code, state, stateCookie }) {
  if (!code || !verifySignedState(stateCookie, state)) throw new UnauthorizedError('Resposta de login inválida ou expirada.', 'AUTH_INVALID_CALLBACK')
  const attempt = await authRepository.consumeLoginAttempt(hash(state))
  if (!attempt) throw new UnauthorizedError('Tentativa de login inválida ou expirada.', 'AUTH_INVALID_CALLBACK')
  const identity = await googleProvider.exchangeCode({ code, codeVerifier: attempt.code_verifier })
  if (!identity.sub || identity.nonce !== attempt.nonce || identity.email_verified !== true) {
    throw new UnauthorizedError('O Google não confirmou uma identidade válida.', 'AUTH_INVALID_CALLBACK')
  }
  const email = normalizeEmail(identity.email)
  if (!isAllowed(email)) throw new ForbiddenError('Este e-mail não está autorizado a acessar o Cofre.', [], 'AUTH_NOT_ALLOWED')

  const user = await authRepository.upsertUser({ googleSub: identity.sub, email, name: identity.name || email, avatarUrl: identity.picture })
  if (config.googleAuth.legacyOwnerEmail === email) await authRepository.claimLegacyData(user.id)

  const sessionToken = randomToken(48)
  await authRepository.createSession({ tokenHash: hash(sessionToken), userId: user.id, expiresAt: sqlDate(new Date(Date.now() + sessionTtlSeconds() * 1000)) })
  return { sessionToken, user: mapUser(user), redirectUrl: frontendUrl() }
}

async function getAuthenticatedUser(sessionToken) {
  if (!sessionToken) return null
  const tokenHash = hash(sessionToken)
  const session = await authRepository.findSession(tokenHash)
  if (!session) return null
  if (!isAllowed(session.email)) {
    await authRepository.deleteSession(tokenHash)
    return null
  }
  const remainingMs = new Date(`${session.expires_at.replace(' ', 'T')}Z`).getTime() - Date.now()
  if (remainingMs < (sessionTtlSeconds() * 1000) / 2) {
    await authRepository.renewSession(tokenHash, sqlDate(new Date(Date.now() + sessionTtlSeconds() * 1000)))
  }
  return mapUser(session)
}

async function logout(sessionToken) { if (sessionToken) await authRepository.deleteSession(hash(sessionToken)) }
function getCookieSettings() { return { httpOnly: true, secure: config.isProduction, sameSite: 'Lax', path: '/', maxAge: sessionTtlSeconds() } }
function getStateCookieSettings() { return { httpOnly: true, secure: config.isProduction, sameSite: 'Lax', path: '/api/auth', maxAge: STATE_TTL_SECONDS } }
function getFrontendUrl() { return frontendUrl() }
function setGoogleProviderForTests(provider) { if (config.env === 'test') googleProvider = provider }

module.exports = { beginGoogleLogin, completeGoogleLogin, getAuthenticatedUser, logout, getCookieSettings, getStateCookieSettings, getFrontendUrl, STATE_COOKIE_NAME, setGoogleProviderForTests }
