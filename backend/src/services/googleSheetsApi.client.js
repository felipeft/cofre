const config = require('../config')
const GoogleIntegrationError = require('../errors/GoogleIntegrationError')
const HTTP_STATUS = require('../constants/httpStatus')

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const SHEETS_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

function configured() {
  if (!config.googleAuth.clientId || !config.googleAuth.clientSecret || !config.googleSheets.callbackUrl) {
    throw new GoogleIntegrationError('A integração Google Sheets ainda não está configurada.', { code: 'GOOGLE_SHEETS_NOT_CONFIGURED', statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE })
  }
}

function authorizationUrl({ state, nonce, codeChallenge, loginHint }) {
  configured()
  const url = new URL(AUTH_URL)
  url.search = new URLSearchParams({
    client_id: config.googleAuth.clientId,
    redirect_uri: config.googleSheets.callbackUrl,
    response_type: 'code',
    scope: `openid email ${config.googleSheets.scope}`,
    state, nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent select_account',
    login_hint: loginHint,
  }).toString()
  return url.toString()
}

async function request(url, options = {}) {
  let response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(config.http.requestTimeoutMs) })
  } catch (error) {
    throw new GoogleIntegrationError('O Google não respondeu a tempo. Tente novamente.', { code: 'GOOGLE_API_UNAVAILABLE', details: [error.name] })
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const providerCode = payload.error?.status || payload.error || `HTTP_${response.status}`
    const error = new GoogleIntegrationError('Não foi possível concluir a operação no Google Sheets.', {
      code: providerCode === 'invalid_grant' ? 'GOOGLE_TOKEN_REVOKED' : response.status === 404 ? 'GOOGLE_SHEET_NOT_FOUND' : response.status === 429 ? 'GOOGLE_RATE_LIMITED' : response.status === 401 || response.status === 403 ? 'GOOGLE_AUTHORIZATION_FAILED' : 'GOOGLE_API_ERROR',
      statusCode: response.status === 429 ? HTTP_STATUS.TOO_MANY_REQUESTS : HTTP_STATUS.BAD_GATEWAY,
      details: [String(providerCode)],
    })
    error.providerStatus = response.status
    throw error
  }
  return payload
}

async function exchangeCode({ code, codeVerifier }) {
  configured()
  return request(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, code_verifier: codeVerifier, client_id: config.googleAuth.clientId, client_secret: config.googleAuth.clientSecret, redirect_uri: config.googleSheets.callbackUrl, grant_type: 'authorization_code' }),
  })
}

async function refreshAccessToken(refreshToken) {
  const payload = await request(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: config.googleAuth.clientId, client_secret: config.googleAuth.clientSecret, grant_type: 'refresh_token' }),
  })
  return payload.access_token
}

function headers(accessToken) { return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
function encodeId(id) { return encodeURIComponent(id) }

function createSpreadsheet(accessToken, body) {
  return request(SHEETS_URL, { method: 'POST', headers: headers(accessToken), body: JSON.stringify(body) })
}
function getSpreadsheet(accessToken, spreadsheetId, fields = 'spreadsheetId,properties.title,sheets.properties') {
  return request(`${SHEETS_URL}/${encodeId(spreadsheetId)}?fields=${encodeURIComponent(fields)}`, { headers: headers(accessToken) })
}
function batchUpdate(accessToken, spreadsheetId, requests) {
  return request(`${SHEETS_URL}/${encodeId(spreadsheetId)}:batchUpdate`, { method: 'POST', headers: headers(accessToken), body: JSON.stringify({ requests }) })
}
function batchClear(accessToken, spreadsheetId, ranges) {
  return request(`${SHEETS_URL}/${encodeId(spreadsheetId)}/values:batchClear`, { method: 'POST', headers: headers(accessToken), body: JSON.stringify({ ranges }) })
}
function valuesBatchUpdate(accessToken, spreadsheetId, data) {
  return request(`${SHEETS_URL}/${encodeId(spreadsheetId)}/values:batchUpdate`, { method: 'POST', headers: headers(accessToken), body: JSON.stringify({ valueInputOption: 'RAW', data }) })
}
function valuesBatchGet(accessToken, spreadsheetId, ranges) {
  const query = new URLSearchParams({ majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' })
  ranges.forEach((range) => query.append('ranges', range))
  return request(`${SHEETS_URL}/${encodeId(spreadsheetId)}/values:batchGet?${query}`, { headers: headers(accessToken) })
}
async function revoke(refreshToken) {
  try { await request(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' }) } catch { /* best effort; local credential is removed regardless */ }
}

module.exports = { authorizationUrl, exchangeCode, refreshAccessToken, createSpreadsheet, getSpreadsheet, batchUpdate, batchClear, valuesBatchUpdate, valuesBatchGet, revoke }
