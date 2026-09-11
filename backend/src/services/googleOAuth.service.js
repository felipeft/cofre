const crypto = require('crypto')
const config = require('../config')
const AppError = require('../errors/AppError')
const HTTP_STATUS = require('../constants/httpStatus')

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const JWKS_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/certs'
let jwksCache = { expiresAt: 0, keys: [] }

function assertConfigured() {
  if (!config.googleAuth.clientId || !config.googleAuth.clientSecret || !config.googleAuth.callbackUrl) {
    throw new AppError('Google OAuth ainda não está configurado.', { statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE, code: 'AUTH_NOT_CONFIGURED' })
  }
}

function createAuthorizationUrl({ state, nonce, codeChallenge }) {
  assertConfigured()
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.search = new URLSearchParams({
    client_id: config.googleAuth.clientId,
    redirect_uri: config.googleAuth.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  }).toString()
  return url.toString()
}

async function exchangeCode({ code, codeVerifier }) {
  assertConfigured()
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleAuth.clientId,
      client_secret: config.googleAuth.clientSecret,
      redirect_uri: config.googleAuth.callbackUrl,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.id_token) throw new Error('Google recusou a troca do código OAuth.')
  return verifyIdToken(payload.id_token)
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

async function getJwks() {
  if (jwksCache.expiresAt > Date.now()) return jwksCache.keys
  const response = await fetch(JWKS_ENDPOINT)
  if (!response.ok) throw new Error('Não foi possível obter as chaves públicas do Google.')
  const body = await response.json()
  const maxAge = Number(/max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 3600)
  jwksCache = { keys: body.keys || [], expiresAt: Date.now() + maxAge * 1000 }
  return jwksCache.keys
}

async function verifyIdToken(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('ID Token inválido.')
  const [encodedHeader, encodedPayload, signature] = parts
  const header = decodePart(encodedHeader)
  const payload = decodePart(encodedPayload)
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Algoritmo do ID Token inválido.')
  const jwk = (await getJwks()).find((key) => key.kid === header.kid && key.use === 'sig')
  if (!jwk) throw new Error('Chave de assinatura do Google não encontrada.')
  const validSignature = crypto.verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(signature, 'base64url'))
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  const validIssuer = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com'
  if (!validSignature || !validIssuer || !audience.includes(config.googleAuth.clientId) || Number(payload.exp) * 1000 <= Date.now()) {
    throw new Error('Identidade Google inválida ou expirada.')
  }
  return payload
}

module.exports = { createAuthorizationUrl, exchangeCode }
