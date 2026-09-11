process.env.NODE_ENV = 'test'
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { yearsFromStart, missingYearSheets } = require('../src/domain/googleSheetsCalendar')
const { transactionToSheetRow, sheetRowToImportCandidate } = require('../src/utils/mappers/googleSheets.mapper')
const { TRANSACTION_HEADERS } = require('../src/constants/googleSheets')
const { encryptToken, decryptToken } = require('../src/utils/tokenEncryption')

describe('calendário anual do Google Sheets', () => {
  test('gera 2024, 2025 e 2026 sem depender do relógio', () => {
    assert.deepEqual(yearsFromStart(2024, 2026), [2024, 2025, 2026])
  })

  test('em 2027 cria somente a aba ausente', () => {
    assert.deepEqual(missingYearSheets(['Metadata', '2024', '2025', '2026'], 2024, 2027), [2027])
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
  assert.equal(sheetRow[5], '=Café ☕')
  assert.equal(sheetRow[8], 12.34)
  assert.equal(sheetRow[10], '')
  const parsed = sheetRowToImportCandidate(TRANSACTION_HEADERS, sheetRow, 2)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.amount, 12.34)
  assert.equal(parsed.data.date, '2024-02-29')
  assert.equal(parsed.data.description, '=Café ☕')
  assert.equal(parsed.data.notes, '@nota unicode ç')
  assert.deepEqual(parsed.data.tags, ['café'])
})
