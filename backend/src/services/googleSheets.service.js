const crypto = require('crypto')
const config = require('../config')
const repository = require('../repositories/googleSheets.repository')
const dataRepository = require('../repositories/googleSheetsData.repository')
const profileRepository = require('../repositories/profile.repository')
const defaultGoogleClient = require('./googleSheetsApi.client')
const googleOAuth = require('./googleOAuth.service')
const { encryptToken, decryptToken } = require('../utils/tokenEncryption')
const { yearsFromStart, missingYearSheets } = require('../domain/googleSheetsCalendar')
const { transactionToSheetRow, sheetRowToImportCandidate } = require('../utils/mappers/googleSheets.mapper')
const {
  SHEET_SCHEMA_VERSION, SPREADSHEET_NAME, AUXILIARY_SHEETS, TRANSACTION_HEADERS,
  CATEGORY_HEADERS, CARD_HEADERS, RECURRING_HEADERS, PAYMENT_HEADERS, SETTINGS_HEADERS,
} = require('../constants/googleSheets')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ConflictError = require('../errors/ConflictError')
const ValidationError = require('../errors/ValidationError')
const GoogleIntegrationError = require('../errors/GoogleIntegrationError')
const logger = require('../utils/logger')

const ATTEMPT_TTL_SECONDS = 600
const STATE_COOKIE_NAME = 'cofre_sheets_state'
let googleClient = defaultGoogleClient
let verifyIdentity = googleOAuth.verifyIdToken

function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url') }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function sqlDate(date) { return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '') }
function safeEqual(a, b) {
  const left = Buffer.from(String(a || '')); const right = Buffer.from(String(b || ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
function frontendRedirect(query = '') { return `${new URL(config.googleSheets.callbackUrl).origin}/configuracoes${query}` }
function stateCookieSettings() { return { httpOnly: true, secure: config.isProduction, sameSite: 'Lax', path: '/api/integrations/google-sheets', maxAge: ATTEMPT_TTL_SECONDS } }
function quote(title) { return `'${String(title).replaceAll("'", "''")}'` }

function mapIntegration(row, suggestedStartYear = null) {
  if (!row) return { status: 'not_connected', connected: false, suggestedStartYear }
  return {
    status: row.status,
    connected: Boolean(row.refresh_token_encrypted),
    googleAccountEmail: row.google_account_email,
    spreadsheetId: row.spreadsheet_id || null,
    spreadsheetName: row.spreadsheet_name || null,
    spreadsheetUrl: row.spreadsheet_id ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(row.spreadsheet_id)}/edit` : null,
    startYear: row.start_year == null ? null : Number(row.start_year),
    connectedAt: row.connected_at,
    lastExportAt: row.last_export_at,
    lastImportAt: row.last_import_at,
    lastErrorCode: row.last_error_code || null,
    suggestedStartYear,
  }
}

async function getStatus(userId, currentYear = new Date().getUTCFullYear()) {
  const [row, suggested] = await Promise.all([repository.findByUserId(userId), repository.suggestedStartYear(userId, currentYear)])
  return mapIntegration(row, suggested)
}

async function beginAuthorization(user) {
  const identity = await profileRepository.findById(user.id)
  const state = randomToken(); const nonce = randomToken(); const codeVerifier = randomToken(48)
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  await repository.createAttempt({ stateHash: hash(state), userId: user.id, nonce, codeVerifier, expiresAt: sqlDate(new Date(Date.now() + ATTEMPT_TTL_SECONDS * 1000)) })
  return { authorizationUrl: googleClient.authorizationUrl({ state, nonce, codeChallenge, loginHint: identity.email }), stateCookie: state }
}

async function completeAuthorization(user, { code, state, stateCookie }) {
  if (!code || !safeEqual(state, stateCookie)) throw new UnauthorizedError('Autorização Google Sheets inválida ou expirada.', 'AUTH_INVALID_CALLBACK')
  const attempt = await repository.consumeAttempt(hash(state), user.id)
  if (!attempt) throw new UnauthorizedError('Autorização Google Sheets inválida ou expirada.', 'AUTH_INVALID_CALLBACK')
  const tokens = await googleClient.exchangeCode({ code, codeVerifier: attempt.code_verifier })
  if (!tokens.id_token) throw new UnauthorizedError('O Google não confirmou a conta autorizada.', 'AUTH_INVALID_CALLBACK')
  const [identity, cofreIdentity] = await Promise.all([verifyIdentity(tokens.id_token), profileRepository.findById(user.id)])
  if (identity.email_verified !== true || identity.nonce !== attempt.nonce || identity.sub !== cofreIdentity.google_sub) {
    throw new ConflictError('Autorize o Google Sheets com a mesma conta usada para entrar no Cofre.', [], 'GOOGLE_ACCOUNT_MISMATCH')
  }
  const scopes = String(tokens.scope || '').split(' ').filter(Boolean)
  if (!scopes.includes(config.googleSheets.scope)) throw new UnauthorizedError('A permissão Google Drive solicitada não foi concedida.', 'GOOGLE_SCOPE_MISSING')
  const current = await repository.findByUserId(user.id)
  if (!tokens.refresh_token && !current?.refresh_token_encrypted) {
    throw new GoogleIntegrationError('O Google não forneceu acesso persistente. Revogue o acesso do Cofre no Google e tente novamente.', { code: 'GOOGLE_REFRESH_TOKEN_MISSING' })
  }
  const row = await repository.saveAuthorization(user.id, {
    googleSub: identity.sub,
    email: String(identity.email || cofreIdentity.email).toLowerCase(),
    refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    scopes: scopes.join(' '),
  })
  logger.info('Integração Google Sheets conectada', { userId: user.id })
  return mapIntegration(row)
}

async function getAccess(userId) {
  const integration = await repository.findByUserId(userId)
  if (!integration?.refresh_token_encrypted) throw new UnauthorizedError('Conecte novamente o Google Sheets.', 'GOOGLE_REAUTHORIZATION_REQUIRED')
  try {
    const refreshToken = decryptToken(integration.refresh_token_encrypted)
    return { integration, token: await googleClient.refreshAccessToken(refreshToken), refreshToken }
  } catch (error) {
    if (['GOOGLE_TOKEN_REVOKED', 'GOOGLE_AUTHORIZATION_FAILED'].includes(error.code)) {
      await repository.markError(userId, { status: 'reauthorization_required', code: error.code, clearToken: true })
      logger.warn('Token Google inválido', { userId, code: error.code })
    }
    throw error
  }
}

async function ensureManagedSheets(token, spreadsheetId, startYear, currentYear) {
  const spreadsheet = await googleClient.getSpreadsheet(token, spreadsheetId)
  const existing = spreadsheet.sheets.map((sheet) => sheet.properties.title)
  const missing = [...AUXILIARY_SHEETS.filter((title) => !existing.includes(title)), ...missingYearSheets(existing, startYear, currentYear).map(String)]
  if (missing.length) await googleClient.batchUpdate(token, spreadsheetId, missing.map((title) => ({ addSheet: { properties: { title } } })))
  return missing
}

function auxiliaryRows(data, now, userId, createdAt) {
  return {
    Metadata: [['key', 'value'], ['schema_version', SHEET_SCHEMA_VERSION], ['cofre_user_id', userId], ['created_by_cofre', true], ['created_at', createdAt], ['last_export_at', now]],
    Categorias: [CATEGORY_HEADERS, ...data.categories.map((r) => [r.id, r.name, r.type, r.color, r.icon, Boolean(r.is_active), r.sort_order, Boolean(r.apply_offer), r.offer_rate ?? '', Boolean(r.apply_tithe), r.tithe_rate ?? '', r.created_at, r.updated_at])],
    Cartões: [CARD_HEADERS, ...data.cards.map((r) => [r.id, r.name, r.credit_limit, r.closing_day, r.due_day, Boolean(r.is_active), r.created_at, r.updated_at])],
    'Gastos Recorrentes': [RECURRING_HEADERS, ...data.recurringExpenses.map((r) => [r.id, r.description, r.amount, r.category_id, r.category_name, r.day_of_month, r.start_date, r.end_date ?? '', Boolean(r.is_active), r.card_id ?? '', r.card_name ?? '', r.notes, r.source, r.created_at, r.updated_at])],
    'Pagamentos de Fatura': [PAYMENT_HEADERS, ...data.payments.map((r) => [r.id, r.card_id, r.card_name, r.amount, r.paid_at, r.notes, r.created_at])],
    Configurações: [SETTINGS_HEADERS, [data.settings.default_offer_rate, data.settings.default_tithe_rate, data.settings.updated_at]],
  }
}

function formatRequests(spreadsheet) {
  const requests = []
  for (const sheet of spreadsheet.sheets) {
    const title = sheet.properties.title
    if (!AUXILIARY_SHEETS.includes(title) && !/^\d{4}$/.test(title)) continue
    const sheetId = sheet.properties.sheetId
    requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } })
    requests.push({ repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.08, green: 0.12, blue: 0.16 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } })
    requests.push({ autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: /^\d{4}$/.test(title) ? TRANSACTION_HEADERS.length : 15 } } })
    if (/^\d{4}$/.test(title)) {
      requests.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: TRANSACTION_HEADERS.length } } } })
      for (const column of [8, 16, 17]) requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' } } }, fields: 'userEnteredFormat.numberFormat' } })
    }
  }
  return requests
}

async function handleFileError(userId, error) {
  if (error.code === 'GOOGLE_SHEET_NOT_FOUND') await repository.markError(userId, { status: 'file_missing', code: error.code })
}

async function createSpreadsheet(userId, { startYear }, currentYear = new Date().getUTCFullYear()) {
  const { integration, token } = await getAccess(userId)
  if (integration.spreadsheet_id && integration.status !== 'file_missing') throw new ConflictError('Este usuário já possui uma planilha do Cofre.')
  const years = yearsFromStart(startYear, currentYear)
  if (!years.length) throw new ValidationError('O ano inicial não pode ser posterior ao ano atual.')
  const titles = [...AUXILIARY_SHEETS, ...years.map(String)]
  const created = await googleClient.createSpreadsheet(token, { properties: { title: SPREADSHEET_NAME }, sheets: titles.map((title) => ({ properties: { title } })) })
  await repository.saveSpreadsheet(userId, { spreadsheetId: created.spreadsheetId, spreadsheetName: SPREADSHEET_NAME, startYear })
  logger.info('Planilha Cofre criada', { userId, spreadsheetId: created.spreadsheetId })
  await exportData(userId, currentYear)
  return getStatus(userId, currentYear)
}

async function exportData(userId, currentYear = new Date().getUTCFullYear()) {
  const { integration, token } = await getAccess(userId)
  if (!integration.spreadsheet_id) throw new ConflictError('Crie a planilha do Cofre antes de exportar.')
  try {
    const data = await dataRepository.getExportData(userId)
    const lastDataYear = data.transactions.reduce((last, row) => Math.max(last, Number(row.competence_year)), currentYear)
    await ensureManagedSheets(token, integration.spreadsheet_id, Number(integration.start_year), lastDataYear)
    const spreadsheet = await googleClient.getSpreadsheet(token, integration.spreadsheet_id)
    const now = new Date().toISOString()
    const rows = auxiliaryRows(data, now, userId, integration.created_at)
    for (const year of yearsFromStart(Number(integration.start_year), lastDataYear)) {
      rows[String(year)] = [TRANSACTION_HEADERS, ...data.transactions.filter((row) => Number(row.competence_year) === year).map(transactionToSheetRow)]
    }
    const entries = Object.entries(rows)
    await googleClient.batchClear(token, integration.spreadsheet_id, entries.map(([title]) => `${quote(title)}!A:AZ`))
    await googleClient.valuesBatchUpdate(token, integration.spreadsheet_id, entries.map(([title, values]) => ({ range: `${quote(title)}!A1`, majorDimension: 'ROWS', values })))
    const formatting = formatRequests(spreadsheet)
    if (formatting.length) await googleClient.batchUpdate(token, integration.spreadsheet_id, formatting)
    await repository.markOperation(userId, 'export')
    logger.info('Exportação Google Sheets concluída', { userId, transactionCount: data.transactions.length })
    return { exportedTransactions: data.transactions.length, exportedAt: now }
  } catch (error) { await handleFileError(userId, error); throw error }
}

function sameExisting(row, candidate) {
  return row.date === candidate.date && Number(row.competence_year) === candidate.competenceYear && Number(row.competence_month) === candidate.competenceMonth && row.type === candidate.type && row.description === candidate.description && Number(row.category_id) === candidate.categoryId && Number(row.amount) === candidate.amount && (row.card_id == null ? null : Number(row.card_id)) === candidate.cardId && Number(row.offer_amount) === candidate.offerAmount && Number(row.tithe_amount) === candidate.titheAmount && row.status === candidate.status && (row.notes || '') === candidate.notes
}

async function readRows(userId) {
  const { integration, token } = await getAccess(userId)
  if (!integration.spreadsheet_id) throw new ConflictError('Crie a planilha do Cofre antes de importar.')
  try {
    const spreadsheet = await googleClient.getSpreadsheet(token, integration.spreadsheet_id)
    const years = spreadsheet.sheets.map((sheet) => sheet.properties.title).filter((title) => /^\d{4}$/.test(title)).sort()
    const payload = await googleClient.valuesBatchGet(token, integration.spreadsheet_id, [`${quote('Metadata')}!A:B`, ...years.map((year) => `${quote(year)}!A:AB`)])
    const [metadataRange, ...yearRanges] = payload.valueRanges || []
    const metadata = Object.fromEntries((metadataRange?.values || []).slice(1).map((row) => [String(row[0]), row[1]]))
    if (Number(metadata.schema_version) !== SHEET_SCHEMA_VERSION || Number(metadata.cofre_user_id) !== Number(userId)) {
      throw new ConflictError('A planilha não possui o schema esperado ou pertence a outro usuário.', [], 'GOOGLE_SHEET_SCHEMA_MISMATCH')
    }
    const parsed = []
    for (const valueRange of yearRanges) {
      const [headers = [], ...rows] = valueRange.values || []
      rows.forEach((row, index) => { if (row.some((value) => value !== '')) parsed.push(sheetRowToImportCandidate(headers, row, index + 2)) })
    }
    return parsed
  } catch (error) { await handleFileError(userId, error); throw error }
}

async function buildPreview(userId) {
  const [parsed, refs, existingRows] = await Promise.all([readRows(userId), dataRepository.getOwnedReferences(userId), dataRepository.findTransactionsForImport(userId)])
  const existingById = new Map(existingRows.map((row) => [Number(row.id), row]))
  const result = { newRows: [], existing: [], invalid: [], conflicts: [] }
  for (const item of parsed) {
    if (!item.success) { result.invalid.push(item); continue }
    const candidate = item.data
    const categoryType = refs.categories.get(candidate.categoryId)
    if (!categoryType || categoryType !== candidate.type || (candidate.cardId && !refs.cards.has(candidate.cardId)) || (candidate.recurringExpenseId && !refs.recurring.has(candidate.recurringExpenseId))) {
      result.conflicts.push({ rowNumber: item.rowNumber, reason: 'Categoria, cartão ou recorrência inválida para este usuário.' }); continue
    }
    if (!candidate.transactionId) { result.newRows.push({ rowNumber: item.rowNumber, data: candidate }); continue }
    const existing = existingById.get(candidate.transactionId)
    if (!existing) result.conflicts.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId, reason: 'ID desconhecido. Remova o ID para importar como novo.' })
    else if (sameExisting(existing, candidate)) result.existing.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId })
    else result.conflicts.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId, reason: 'A linha difere da transação existente no Cofre.' })
  }
  const candidates = result.newRows.map((item) => item.data)
  return {
    summary: { new: candidates.length, existing: result.existing.length, invalid: result.invalid.length, conflicts: result.conflicts.length },
    fingerprint: hash(JSON.stringify(candidates)), details: { invalid: result.invalid, conflicts: result.conflicts }, candidates,
  }
}

async function previewImport(userId) {
  const preview = await buildPreview(userId)
  return { summary: preview.summary, fingerprint: preview.fingerprint, details: preview.details, canImport: preview.summary.invalid === 0 && preview.summary.conflicts === 0 && preview.summary.new > 0 }
}

async function confirmImport(userId, fingerprint) {
  const preview = await buildPreview(userId)
  if (!safeEqual(preview.fingerprint, fingerprint)) throw new ConflictError('A planilha mudou após o preview. Revise os dados novamente.', [], 'IMPORT_PREVIEW_STALE')
  if (preview.summary.invalid || preview.summary.conflicts) throw new ConflictError('Corrija as linhas inválidas ou conflitantes antes de importar.', preview.details, 'IMPORT_HAS_CONFLICTS')
  const imported = await dataRepository.importTransactions(userId, preview.candidates, fingerprint)
  await repository.markOperation(userId, 'import')
  logger.info('Importação Google Sheets concluída', { userId, importedCount: imported.importedCount, alreadyImported: imported.alreadyImported })
  return imported
}

async function disconnect(userId) {
  const integration = await repository.findByUserId(userId)
  if (integration?.refresh_token_encrypted) {
    try { await googleClient.revoke(decryptToken(integration.refresh_token_encrypted)) } catch { /* revogação remota é best effort */ }
  }
  await repository.remove(userId)
  logger.info('Integração Google Sheets desconectada', { userId })
}

function setGoogleClientForTests(client) { if (config.env === 'test') googleClient = client }
function setIdentityVerifierForTests(verifier) { if (config.env === 'test') verifyIdentity = verifier }

module.exports = {
  getStatus, beginAuthorization, completeAuthorization, createSpreadsheet, exportData,
  previewImport, confirmImport, disconnect, stateCookieSettings, STATE_COOKIE_NAME,
  frontendRedirect, setGoogleClientForTests, setIdentityVerifierForTests, ensureManagedSheets,
}
