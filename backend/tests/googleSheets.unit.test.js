process.env.NODE_ENV = 'test'
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { yearsFromStart, missingYearSheets } = require('../src/domain/googleSheetsCalendar')
const { transactionToSheetRow, sheetRowToImportCandidate } = require('../src/utils/mappers/googleSheets.mapper')
const { TRANSACTION_HEADERS, TRANSACTIONS_MARKER } = require('../src/constants/googleSheets')
const { buildYearSheet } = require('../src/domain/googleSheetsLayout')
const { encryptToken, decryptToken } = require('../src/utils/tokenEncryption')

describe('calendário anual do Google Sheets', () => {
  test('gera 2024, 2025 e 2026 sem depender do relógio', () => {
    assert.deepEqual(yearsFromStart(2024, 2026), [2024, 2025, 2026])
  })

  test('em 2027 cria somente a aba ausente', () => {
    assert.deepEqual(missingYearSheets(['2024', '2025', '2026'], 2024, 2027), [2027])
  })
})

test('refresh token usa AES-GCM e não fica legível', () => {
  const encrypted = encryptToken('refresh-token-super-secreto')
  assert.equal(encrypted.includes('refresh-token-super-secreto'), false)
  assert.equal(decryptToken(encrypted), 'refresh-token-super-secreto')
})

test('mapper preserva centavos, unicode, datas, ids, nulls e texto iniciado por fórmula', () => {
  const row = {
    id: 9, date: '2024-02-29', competence_year: 2024, competence_month: 2,
    type: 'expense', description: '=Café ☕', category_id: 3, category_name: 'Alimentação',
    amount: 12.34, card_id: null, card_name: null, installment_current: null,
    installment_total: null, installment_group_id: null, recurring_expense_id: null,
    offer_amount: 0, tithe_amount: 0, offer_rate_applied: null, tithe_rate_applied: null,
    status: 'confirmed', source: 'manual', is_recurring: 0, is_fixed: 0,
    tags: '["café"]', notes: '@nota unicode ç', created_at: '2024-02-29 10:00:00', updated_at: '2024-02-29 10:00:00',
  }
  const sheetRow = transactionToSheetRow(row)
  assert.equal(sheetRow[3], '=Café ☕')
  assert.equal(sheetRow[5], 12.34)
  assert.equal(sheetRow[7], '')
  const parsed = sheetRowToImportCandidate(TRANSACTION_HEADERS, sheetRow, 2, 2024)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.amount, 12.34)
  assert.equal(parsed.data.date, '2024-02-29')
  assert.equal(parsed.data.description, '=Café ☕')
  assert.equal(parsed.data.notes, '@nota unicode ç')
  assert.deepEqual(parsed.data.tags, ['café'])
  assert.equal(parsed.data.sheetModified, false)
})

test('layout anual contém resumos, meses, categorias e somente uma área de lançamentos', () => {
  const category = { id: 3, name: 'Alimentação', type: 'expense' }
  const transaction = { id: 9, date: '2024-02-29', competence_year: 2024, competence_month: 2, type: 'expense', description: 'Café', category_id: 3, category_name: 'Alimentação', amount: 12.34, status: 'confirmed', offer_amount: 0, tithe_amount: 0, tags: '[]', source: 'manual', is_recurring: 0, is_fixed: 0, created_at: '2024-02-29 10:00:00' }
  const layout = buildYearSheet({ year: 2024, transactions: [transaction], categories: [category], now: '2024-03-01T12:00:00Z', userId: 7 })
  assert.equal(layout.values[0][0], 'COFRE · 2024')
  assert.equal(layout.values[0][16], 2)
  assert.equal(layout.values[7 + 1][2], 12.34)
  assert.equal(layout.values[layout.markerRow][0], TRANSACTIONS_MARKER)
  assert.equal(layout.values[layout.firstTransactionRow][3], 'Café')
})

test('nova despesa legível aceita data brasileira e campos mínimos', () => {
  const row = []; row[1] = '15/04/2024'; row[2] = 'Despesa'; row[3] = 'Mercado'; row[4] = 'Alimentação'; row[5] = 42.75
  const parsed = sheetRowToImportCandidate(TRANSACTION_HEADERS, row, 30, 2024)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.date, '2024-04-15')
  assert.equal(parsed.data.status, 'confirmed')
  assert.equal(parsed.data.type, 'expense')
})
