const crypto = require('crypto')
const config = require('../config')
const repository = require('../repositories/googleSheets.repository')
const dataRepository = require('../repositories/googleSheetsData.repository')
const profileRepository = require('../repositories/profile.repository')
const defaultGoogleClient = require('./googleSheetsApi.client')
const googleOAuth = require('./googleOAuth.service')
const { encryptToken, decryptToken } = require('../utils/tokenEncryption')
const { yearsFromStart, missingYearSheets } = require('../domain/googleSheetsCalendar')
const { buildYearSheet } = require('../domain/googleSheetsLayout')
const { sheetRowToImportCandidate } = require('../utils/mappers/googleSheets.mapper')
const {
  SHEET_SCHEMA_VERSION, SPREADSHEET_NAME, TRANSACTION_HEADERS, TRANSACTIONS_MARKER,
  MANAGED_LAST_COLUMN, MANAGED_COLUMN_COUNT, VISIBLE_TRANSACTION_COLUMN_COUNT,
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
function sheetColor(value) {
  let hex = String(value || '').replace('#', '')
  if (/^[a-f\d]{3}$/i.test(hex)) hex = hex.split('').map((part) => part + part).join('')
  if (!/^[a-f\d]{6}$/i.test(hex)) return null
  return { red: parseInt(hex.slice(0, 2), 16) / 255, green: parseInt(hex.slice(2, 4), 16) / 255, blue: parseInt(hex.slice(4, 6), 16) / 255 }
}

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
  const missing = missingYearSheets(existing, startYear, currentYear).map(String)
  if (missing.length) await googleClient.batchUpdate(token, spreadsheetId, missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { rowCount: 2500, columnCount: MANAGED_COLUMN_COUNT } } } })))
  return missing
}

function formatRequests(spreadsheet, layouts, data) {
  const requests = []
  for (const sheet of spreadsheet.sheets) {
    const title = sheet.properties.title
    if (!/^\d{4}$/.test(title) || !layouts[title]) continue
    const sheetId = sheet.properties.sheetId
    const layout = layouts[title]
    requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 2 } }, fields: 'gridProperties.frozenRowCount' } })
    requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: VISIBLE_TRANSACTION_COLUMN_COUNT, endIndex: MANAGED_COLUMN_COUNT }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' } })
    for (const rowIndex of [0, 3, 5, 6, 20, 21, layout.markerRow, layout.headerRow]) requests.push({ repeatCell: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: VISIBLE_TRANSACTION_COLUMN_COUNT }, cell: { userEnteredFormat: { backgroundColor: { red: rowIndex === 0 ? 0.04 : 0.08, green: rowIndex === 0 ? 0.32 : 0.18, blue: rowIndex === 0 ? 0.22 : 0.2 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } })
    data.categories.filter((category) => category.type === 'expense').forEach((category, index) => {
      const color = sheetColor(category.color)
      if (color) requests.push({ repeatCell: { range: { sheetId, startRowIndex: layout.firstCategoryRow + index, endRowIndex: layout.firstCategoryRow + index + 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { textFormat: { foregroundColor: color, bold: true } } }, fields: 'userEnteredFormat.textFormat' } })
    })
    requests.push({ autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: VISIBLE_TRANSACTION_COLUMN_COUNT } } })
    requests.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: layout.headerRow, startColumnIndex: 0, endColumnIndex: VISIBLE_TRANSACTION_COLUMN_COUNT } } } })
    for (const [startRow, endRow, startColumn, endColumn] of [[3, 4, 3, 8], [7, 19, 1, 4], [layout.firstCategoryRow, layout.firstCategoryRow + layout.categoryCount, 1, 14], [layout.firstTransactionRow, layout.firstTransactionRow + 2000, 5, 6]]) if (endRow > startRow) requests.push({ repeatCell: { range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startColumn, endColumnIndex: endColumn }, cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' } } }, fields: 'userEnteredFormat.numberFormat' } })
    const validations = [[2, ['Despesa']], [4, data.categories.filter((c) => c.type === 'expense' && c.is_active).map((c) => c.name)], [6, ['Dinheiro', 'Cartão']], [7, data.cards.filter((c) => c.is_active).map((c) => c.name)], [10, ['Confirmada', 'Pendente', 'Cancelada']]]
    for (const [column, values] of validations) if (values.length) requests.push({ setDataValidation: { range: { sheetId, startRowIndex: layout.firstTransactionRow, endRowIndex: layout.firstTransactionRow + 2000, startColumnIndex: column, endColumnIndex: column + 1 }, rule: { condition: { type: 'ONE_OF_LIST', values: values.map((userEnteredValue) => ({ userEnteredValue })) }, strict: true, showCustomUi: true } } })
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
  const titles = years.map(String)
  const created = await googleClient.createSpreadsheet(token, { properties: { title: SPREADSHEET_NAME }, sheets: titles.map((title) => ({ properties: { title, gridProperties: { rowCount: 2500, columnCount: MANAGED_COLUMN_COUNT } } })) })
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
    const rows = {}; const layouts = {}
    for (const year of yearsFromStart(Number(integration.start_year), lastDataYear)) {
      layouts[String(year)] = buildYearSheet({ year, transactions: data.transactions.filter((row) => Number(row.competence_year) === year), categories: data.categories, now, userId })
      rows[String(year)] = layouts[String(year)].values
    }
    const entries = Object.entries(rows)
    await googleClient.batchClear(token, integration.spreadsheet_id, entries.map(([title]) => `${quote(title)}!A:${MANAGED_LAST_COLUMN}`))
    await googleClient.valuesBatchUpdate(token, integration.spreadsheet_id, entries.map(([title, values]) => ({ range: `${quote(title)}!A1`, majorDimension: 'ROWS', values })))
    const formatting = formatRequests(spreadsheet, layouts, data)
    if (formatting.length) await googleClient.batchUpdate(token, integration.spreadsheet_id, formatting)
    await repository.markOperation(userId, 'export')
    const breakdown = {
      transactions: data.transactions.length,
      categorySummaries: data.categories.filter((category) => category.type === 'expense').length,
    }
    const exportedRecords = Object.values(breakdown).reduce((total, count) => total + count, 0)
    logger.info('Exportação Google Sheets concluída', { userId, transactionCount: data.transactions.length, exportedRecords })
    return { exportedTransactions: data.transactions.length, exportedRecords, breakdown, exportedAt: now }
  } catch (error) { await handleFileError(userId, error); throw error }
}

async function readRows(userId) {
  const { integration, token } = await getAccess(userId)
  if (!integration.spreadsheet_id) throw new ConflictError('Crie a planilha do Cofre antes de importar.')
  try {
    const spreadsheet = await googleClient.getSpreadsheet(token, integration.spreadsheet_id)
    const years = spreadsheet.sheets.map((sheet) => sheet.properties.title).filter((title) => /^\d{4}$/.test(title)).sort()
    const payload = await googleClient.valuesBatchGet(token, integration.spreadsheet_id, years.map((year) => `${quote(year)}!A:${MANAGED_LAST_COLUMN}`))
    const yearRanges = payload.valueRanges || []
    const parsed = []
    for (let index = 0; index < yearRanges.length; index += 1) {
      const year = Number(years[index]); const rows = yearRanges[index]?.values || []; const metadata = rows[0] || []
      const schemaVersion = Number(metadata[16])
      if (![2, SHEET_SCHEMA_VERSION].includes(schemaVersion) || Number(metadata[18]) !== Number(userId) || Number(metadata[20]) !== year) {
        throw new ConflictError('A planilha não possui o layout esperado ou pertence a outro usuário.', [], 'GOOGLE_SHEET_SCHEMA_MISMATCH')
      }
      const markerIndex = rows.findIndex((row) => row[0] === TRANSACTIONS_MARKER)
      if (markerIndex < 0 || !rows[markerIndex + 1]) throw new ConflictError(`A seção de lançamentos da aba ${year} não foi encontrada.`, [], 'GOOGLE_SHEET_SCHEMA_MISMATCH')
      const headers = rows[markerIndex + 1]
      rows.slice(markerIndex + 2).forEach((row, rowIndex) => {
        if (row.slice(0, VISIBLE_TRANSACTION_COLUMN_COUNT).some((value) => value !== '')) parsed.push(sheetRowToImportCandidate(headers, row, markerIndex + rowIndex + 3, year, schemaVersion))
      })
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
    let candidate = item.data
    const normalizedCategory = String(candidate.categoryName).trim().toLocaleLowerCase('pt-BR')
    const categoryId = candidate.categoryId ?? refs.categoriesByName.get(`${candidate.type}:${normalizedCategory}`) ?? null
    const normalizedCard = String(candidate.cardName || '').trim().toLocaleLowerCase('pt-BR')
    const cardId = candidate.cardId ?? (normalizedCard ? refs.cardsByName.get(normalizedCard) : null) ?? null
    candidate = { ...candidate, categoryId, cardId }
    const categoryType = refs.categories.get(candidate.categoryId)
    if (!categoryType || categoryType !== candidate.type || (candidate.cardName && !candidate.cardId) || (candidate.cardId && !refs.cards.has(candidate.cardId)) || (candidate.recurringExpenseId && !refs.recurring.has(candidate.recurringExpenseId))) {
      result.conflicts.push({ rowNumber: item.rowNumber, reason: 'Categoria, cartão ou recorrência inválida para este usuário.' }); continue
    }
    if (!candidate.transactionId) { result.newRows.push({ rowNumber: item.rowNumber, data: candidate }); continue }
    const existing = existingById.get(candidate.transactionId)
    if (!existing) result.conflicts.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId, reason: 'ID desconhecido. Remova o ID para importar como novo.' })
    else if (!candidate.exportHash) result.conflicts.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId, reason: 'Esta linha com ID não foi gerada pelo Cofre.' })
    else if (candidate.sheetModified) result.conflicts.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId, reason: 'Uma linha existente foi alterada na planilha. Edite-a no Cofre ou restaure seus valores.' })
    else result.existing.push({ rowNumber: item.rowNumber, transactionId: candidate.transactionId })
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
