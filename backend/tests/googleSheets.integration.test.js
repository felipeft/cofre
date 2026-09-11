const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-sheets-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'
process.env.GOOGLE_CLIENT_ID = 'test-client'
process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/api/auth/google/callback'
process.env.GOOGLE_SHEETS_CALLBACK_URL = 'http://localhost:5173/api/integrations/google-sheets/callback'
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64')
process.env.SESSION_SECRET = 'test-session-secret-with-sufficient-entropy'

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')
const sheetsService = require('../src/services/googleSheets.service')
const categories = asUser(require('../src/services/category.service'), 1)
const transactions = asUser(require('../src/services/transaction.service'), 1)

function titleFromRange(range) { return /^'((?:''|[^'])+)'!/.exec(range)?.[1].replaceAll("''", "'") }

function fakeGoogle() {
  const state = { nonce: null, sheets: [], values: new Map(), deleted: false, revoked: false, revokedCalled: false, nextSheetId: 1 }
  return {
    state,
    authorizationUrl({ state: oauthState, nonce }) { state.nonce = nonce; return `https://accounts.google.test/auth?state=${oauthState}` },
    async exchangeCode() { return { id_token: 'fake-id-token', refresh_token: 'refresh-secret', scope: 'openid email https://www.googleapis.com/auth/drive.file' } },
    async refreshAccessToken() { if (state.revoked) { const error = new Error('revoked'); error.code = 'GOOGLE_TOKEN_REVOKED'; throw error } return 'access-token' },
    async createSpreadsheet(_token, body) {
      state.deleted = false
      state.sheets = body.sheets.map((sheet) => ({ properties: { title: sheet.properties.title, sheetId: state.nextSheetId++ } }))
      return { spreadsheetId: 'sheet-user-a', properties: body.properties, sheets: state.sheets }
    },
    async getSpreadsheet() { if (state.deleted) { const error = new Error('missing'); error.code = 'GOOGLE_SHEET_NOT_FOUND'; throw error } return { spreadsheetId: 'sheet-user-a', properties: { title: 'Cofre - Dados Financeiros' }, sheets: state.sheets } },
    async batchUpdate(_token, _id, requests) {
      for (const request of requests) if (request.addSheet) state.sheets.push({ properties: { title: request.addSheet.properties.title, sheetId: state.nextSheetId++ } })
      return {}
    },
    async batchClear(_token, _id, ranges) { ranges.forEach((range) => state.values.set(titleFromRange(range), [])); return {} },
    async valuesBatchUpdate(_token, _id, data) { data.forEach((entry) => state.values.set(titleFromRange(entry.range), structuredClone(entry.values))); return {} },
    async valuesBatchGet(_token, _id, ranges) { return { valueRanges: ranges.map((range) => ({ range, values: structuredClone(state.values.get(titleFromRange(range)) || []) })) } },
    async revoke() { state.revokedCalled = true },
  }
}

const google = fakeGoogle()

before(async () => {
  await ensureDatabaseReady()
  await createTestUser({ id: 1, email: 'a@example.com', googleSub: 'google-1' })
  await createTestUser({ id: 2, email: 'b@example.com', googleSub: 'google-2' })
  sheetsService.setGoogleClientForTests(google)
  sheetsService.setIdentityVerifierForTests(async () => ({ sub: 'google-1', email: 'a@example.com', email_verified: true, nonce: google.state.nonce }))
})

after(async () => {
  await closeDatabase()
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true })
})

test('autoriza incrementalmente, criptografa refresh token e isola usuários', async () => {
  assert.equal((await sheetsService.getStatus(1, 2026)).status, 'not_connected')
  const login = await sheetsService.beginAuthorization({ id: 1, email: 'a@example.com' })
  await assert.rejects(() => sheetsService.completeAuthorization({ id: 1 }, { code: 'x', state: 'wrong', stateCookie: 'wrong' }))
  const state = new URL(login.authorizationUrl).searchParams.get('state')
  const connected = await sheetsService.completeAuthorization({ id: 1 }, { code: 'ok', state, stateCookie: login.stateCookie })
  assert.equal(connected.status, 'authorized')
  const persisted = await getDatabase().prepare('SELECT * FROM google_sheets_integrations WHERE user_id = 1').get()
  assert.equal(persisted.refresh_token_encrypted.includes('refresh-secret'), false)
  assert.equal((await sheetsService.getStatus(2, 2026)).status, 'not_connected')
})

test('cria abas anuais e exporta repetidamente sem duplicar', async () => {
  const created = await sheetsService.createSpreadsheet(1, { startYear: 2024 }, 2026)
  assert.equal(created.spreadsheetId, 'sheet-user-a')
  assert.deepEqual(google.state.sheets.map((sheet) => sheet.properties.title).filter((title) => /^\d{4}$/.test(title)), ['2024', '2025', '2026'])
  await sheetsService.ensureManagedSheets('access-token', 'sheet-user-a', 2024, 2027)
  assert.equal(google.state.sheets.filter((sheet) => sheet.properties.title === '2027').length, 1)
  await sheetsService.ensureManagedSheets('access-token', 'sheet-user-a', 2024, 2027)
  assert.equal(google.state.sheets.filter((sheet) => sheet.properties.title === '2027').length, 1)

  const category = await categories.createCategory({ name: 'Histórico', type: 'expense', color: '#ffffff', icon: 'Wallet', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null })
  await transactions.createTransaction({ description: 'Café ☕', amount: 12.34, type: 'expense', categoryId: category.id, date: '2024-02-29', notes: '=texto seguro', source: 'manual', isRecurring: false, isFixed: false, tags: ['unicode'], status: 'confirmed' })
  await sheetsService.exportData(1, 2026)
  const first = google.state.values.get('2024').length
  await sheetsService.exportData(1, 2026)
  assert.equal(google.state.values.get('2024').length, first)
  assert.equal(google.state.values.get('2024')[1][8], 12.34)
})

test('preview e confirmação importam atomicamente e são idempotentes', async () => {
  const rows = google.state.values.get('2024')
  const manual = [...rows[1]]
  manual[0] = ''
  manual[5] = 'Registro histórico manual'
  manual[8] = 99.91
  rows.push(manual)
  const preview = await sheetsService.previewImport(1)
  assert.deepEqual(preview.summary, { new: 1, existing: 1, invalid: 0, conflicts: 0 })
  assert.equal(preview.canImport, true)
  const imported = await sheetsService.confirmImport(1, preview.fingerprint)
  assert.equal(imported.importedCount, 1)
  const repeated = await sheetsService.confirmImport(1, preview.fingerprint)
  assert.equal(repeated.alreadyImported, true)
  const count = await getDatabase().prepare("SELECT COUNT(*) AS total FROM transactions WHERE user_id = 1 AND description = 'Registro histórico manual'").get()
  assert.equal(Number(count.total), 1)
})

test('detecta referência inválida, token revogado e planilha apagada sem afetar o Cofre', async () => {
  const rows = google.state.values.get('2024')
  const invalid = [...rows[1]]; invalid[0] = ''; invalid[6] = 999999; rows.push(invalid)
  const preview = await sheetsService.previewImport(1)
  assert.equal(preview.summary.conflicts, 1)
  assert.equal(preview.canImport, false)
  google.state.deleted = true
  await assert.rejects(() => sheetsService.exportData(1, 2026), { code: 'GOOGLE_SHEET_NOT_FOUND' })
  assert.equal((await sheetsService.getStatus(1, 2026)).status, 'file_missing')
  google.state.deleted = false
  google.state.revoked = true
  await assert.rejects(() => sheetsService.exportData(1, 2026), { code: 'GOOGLE_TOKEN_REVOKED' })
  assert.equal((await sheetsService.getStatus(1, 2026)).status, 'reauthorization_required')
})

test('desconectar apaga credencial local, revoga token e preserva a planilha', async () => {
  google.state.revoked = false
  const login = await sheetsService.beginAuthorization({ id: 1, email: 'a@example.com' })
  const state = new URL(login.authorizationUrl).searchParams.get('state')
  await sheetsService.completeAuthorization({ id: 1 }, { code: 'ok', state, stateCookie: login.stateCookie })
  await sheetsService.disconnect(1)
  assert.equal(google.state.revokedCalled, true)
  assert.equal(google.state.deleted, false)
  assert.equal((await sheetsService.getStatus(1, 2026)).status, 'not_connected')
})
