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
const syncService = require('../src/services/googleSheetsSync.service')
const categories = asUser(require('../src/services/category.service'), 1)
const transactions = asUser(require('../src/services/transaction.service'), 1)
const { TRANSACTIONS_MARKER } = require('../src/constants/googleSheets')

function titleFromRange(range) { return /^'((?:''|[^'])+)'!/.exec(range)?.[1].replaceAll("''", "'") }
function transactionSection(rows) {
  const marker = rows.findIndex((row) => row[0] === TRANSACTIONS_MARKER)
  return { marker, header: marker + 1, first: marker + 2 }
}

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
  assert.deepEqual(google.state.sheets.map((sheet) => sheet.properties.title), ['2024', '2025', '2026'])
  await sheetsService.ensureManagedSheets('access-token', 'sheet-user-a', 2024, 2027)
  assert.equal(google.state.sheets.filter((sheet) => sheet.properties.title === '2027').length, 1)
  await sheetsService.ensureManagedSheets('access-token', 'sheet-user-a', 2024, 2027)
  assert.equal(google.state.sheets.filter((sheet) => sheet.properties.title === '2027').length, 1)

  const category = await categories.createCategory({ name: 'Histórico', type: 'expense', color: '#ffffff', icon: 'Wallet', isActive: true, sortOrder: 0 })
  await transactions.createTransaction({ description: 'Café ☕', amount: 12.34, type: 'expense', categoryId: category.id, date: '2024-02-29', notes: '=texto seguro', source: 'manual', isRecurring: false, isFixed: false, tags: ['unicode'], status: 'confirmed' })
  await sheetsService.exportData(1, 2027)
  const first = google.state.values.get('2024').length
  await sheetsService.exportData(1, 2027)
  assert.equal(google.state.values.get('2024').length, first)
  const section = transactionSection(google.state.values.get('2024'))
  assert.equal(google.state.values.get('2024')[section.first][5], 12.34)
})

test('preview e confirmação importam atomicamente e são idempotentes', async () => {
  const rows = google.state.values.get('2024')
  const manual = []
  manual[1] = '01/03/2024'; manual[2] = 'Despesa'; manual[3] = 'Registro histórico manual'
  manual[4] = 'Histórico'; manual[5] = 99.91; manual[6] = 'Dinheiro'; manual[10] = 'Confirmada'
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

test('sincronização consolida importação e exportação com histórico idempotente', async () => {
  const requestId = '11111111-1111-4111-8111-111111111111'
  const completed = await syncService.synchronize(1, requestId)
  assert.equal(completed.status, 'success')
  assert.equal(completed.recordsImported, 0)
  assert.ok(completed.recordsExported >= 3)
  assert.equal(completed.conflictCount, 0)

  const replay = await syncService.synchronize(1, requestId)
  assert.equal(replay.id, completed.id)
  assert.equal(replay.idempotentReplay, true)
  const history = await syncService.getHistory(1, 20)
  assert.equal(history.length, 1)
  assert.equal((await syncService.getHistory(2, 20)).length, 0)
})

test('exclusão no Cofre força exportação antes da importação e não ressuscita linha antiga', async () => {
  const category = (await categories.listCategories({ includeInactive: true })).find((item) => item.name === 'Histórico')
  const created = await transactions.createTransaction({ description: 'Não pode ressuscitar', amount: 7, type: 'expense', categoryId: category.id, date: '2024-04-01', notes: '', source: 'manual', isRecurring: false, isFixed: false, tags: [], status: 'confirmed' })
  await sheetsService.exportData(1, 2027)
  assert.ok(google.state.values.get('2024').some((row) => row.includes('Não pode ressuscitar')))

  await transactions.deleteTransaction(created.id)
  assert.equal((await getDatabase().prepare('SELECT requires_full_export FROM google_sheets_integrations WHERE user_id = 1').get()).requires_full_export, 1)
  const synchronized = await syncService.synchronize(1, '55555555-5555-4555-8555-555555555555')

  assert.equal(synchronized.status, 'success')
  assert.equal((await getDatabase().prepare('SELECT requires_full_export FROM google_sheets_integrations WHERE user_id = 1').get()).requires_full_export, 0)
  assert.equal(google.state.values.get('2024').some((row) => row.includes('Não pode ressuscitar')), false)
  assert.equal(await getDatabase().prepare('SELECT id FROM transactions WHERE id = ?').get(created.id), undefined)
})

test('impede duas sincronizações simultâneas e recupera execução interrompida', async () => {
  const db = getDatabase()
  await db.prepare("INSERT INTO google_sheets_sync_runs (user_id, idempotency_key) VALUES (1, 'active-test')").run()
  await assert.rejects(
    () => syncService.synchronize(1, '44444444-4444-4444-8444-444444444444'),
    { code: 'SYNC_ALREADY_RUNNING' }
  )
  await db.prepare("UPDATE google_sheets_sync_runs SET started_at = datetime('now', '-16 minutes') WHERE idempotency_key = 'active-test'").run()
  const recovered = await syncService.getStatus(1)
  assert.equal(recovered.latest.status, 'failed')
  assert.equal(recovered.latest.error.code, 'SYNC_INTERRUPTED')
})

test('detecta divergência em campos históricos antes de sobrescrever a planilha', async () => {
  const rows = google.state.values.get('2024')
  const row = transactionSection(rows).first
  rows[row][3] = `${rows[row][3]} alterada`
  const preview = await sheetsService.previewImport(1)
  assert.equal(preview.summary.conflicts, 1)
  assert.match(preview.details.conflicts[0].reason, /alterada na planilha/)
  rows[row][3] = rows[row][3].replace(' alterada', '')
})

test('alteração feita no Cofre não cria falso conflito com linha intacta da planilha', async () => {
  await getDatabase().prepare("UPDATE transactions SET description = 'Café atualizado no Cofre', updated_at = datetime('now') WHERE id = 1 AND user_id = 1").run()
  const preview = await sheetsService.previewImport(1)
  assert.equal(preview.summary.conflicts, 0)
  await sheetsService.exportData(1, 2027)
  const rows = google.state.values.get('2024')
  assert.equal(rows[transactionSection(rows).first][3], 'Café atualizado no Cofre')
})

test('detecta referência inválida, token revogado e planilha apagada sem afetar o Cofre', async () => {
  const rows = google.state.values.get('2024')
  const invalid = []; invalid[1] = '02/03/2024'; invalid[2] = 'Despesa'; invalid[3] = 'Inválida'; invalid[4] = 'Categoria inexistente'; invalid[5] = 10; rows.push(invalid)
  const preview = await sheetsService.previewImport(1)
  assert.equal(preview.summary.conflicts, 1)
  assert.equal(preview.canImport, false)

  const conflictRun = await syncService.synchronize(1, '22222222-2222-4222-8222-222222222222')
  assert.equal(conflictRun.status, 'conflicts')
  assert.equal(conflictRun.conflictCount, 1)
  assert.equal(conflictRun.recordsExported, 0)

  google.state.deleted = true
  await assert.rejects(() => syncService.synchronize(1, '33333333-3333-4333-8333-333333333333'), { code: 'GOOGLE_SHEET_NOT_FOUND' })
  const failed = (await syncService.getHistory(1, 1))[0]
  assert.equal(failed.status, 'failed')
  assert.equal(failed.error.code, 'GOOGLE_SHEET_NOT_FOUND')
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
