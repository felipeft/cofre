const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-data-management-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = TEST_DB_PATH; process.env.LOG_LEVEL = 'error'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')
const dataManagementService = require('../src/services/dataManagement.service')
const { clearRecordsSchema, resetSchema } = require('../src/schemas/dataManagement.schema')

const USER_A = 1
const USER_B = 2
const categoriesA = asUser(require('../src/services/category.service'), USER_A)
const categoriesB = asUser(require('../src/services/category.service'), USER_B)
const transactionsA = asUser(require('../src/services/transaction.service'), USER_A)
const transactionsB = asUser(require('../src/services/transaction.service'), USER_B)
const recurringA = asUser(require('../src/services/recurringExpense.service'), USER_A)
const cardsA = asUser(require('../src/services/card.service'), USER_A)

before(async () => { await ensureDatabaseReady(); await createTestUser({ id: USER_A }); await createTestUser({ id: USER_B }) })
after(async () => { await closeDatabase(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true }) })

async function category(service, name) {
  return service.createCategory({ name, type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0 })
}

async function transaction(service, categoryId, description) {
  return service.createTransaction({ description, amount: 10, type: 'expense', categoryId, date: '2026-09-01', notes: '', source: 'manual', isRecurring: false, isFixed: false, tags: [], status: 'confirmed' })
}

test('confirmações destrutivas rejeitam qualquer frase diferente da literal', () => {
  assert.equal(clearRecordsSchema.safeParse({ confirmation: 'limpar registros' }).success, false)
  assert.equal(resetSchema.safeParse({ confirmation: 'RESETAR' }).success, false)
  assert.equal(clearRecordsSchema.safeParse({ confirmation: 'LIMPAR REGISTROS' }).success, true)
})

test('limpar registros preserva estrutura, avança checkpoint e não toca outro usuário', async () => {
  const categoryA = await category(categoriesA, 'Estrutura A')
  const categoryB = await category(categoriesB, 'Estrutura B')
  const card = await cardsA.createCard({ name: 'Cartão A', creditLimit: 500, closingDay: 10, dueDay: 20, isActive: true })
  await transaction(transactionsA, categoryA.id, 'Apagar A')
  await transaction(transactionsB, categoryB.id, 'Preservar B')
  const recurring = await recurringA.createRecurringExpense({ description: 'Recorrente A', amount: 20, categoryId: categoryA.id, dayOfMonth: 10, startDate: '2026-01-01', endDate: null, isActive: true, cardId: card.id, notes: '' })

  const preview = await dataManagementService.getPreview(USER_A, 'clear-records')
  assert.ok(preview.counts.transactions > 0)
  assert.equal(preview.counts.recurringExpenses, undefined)
  await dataManagementService.clearFinancialRecords(USER_A)

  const db = getDatabase()
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?').get(USER_A)).count, 0)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?').get(USER_B)).count, 1)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM categories WHERE user_id = ?').get(USER_A)).count, 1)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM credit_cards WHERE user_id = ?').get(USER_A)).count, 1)
  const kept = await db.prepare('SELECT generated_through FROM recurring_expenses WHERE id = ? AND user_id = ?').get(recurring.id, USER_A)
  assert.equal(kept.generated_through, '2026-09-01')
  assert.deepEqual(await recurringA.ensureRecurringExpensesGenerated({ asOfDate: '2026-09-20' }), { checked: 0, created: 0 })
})

test('reset remove toda estrutura financeira do usuário e preserva conta, sessão e settings', async () => {
  const categoryA = (await categoriesA.listCategories({ includeInactive: true }))[0]
  if (!categoryA) await category(categoriesA, 'Reset A')
  const beforeSettings = await getDatabase().prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_A)
  await dataManagementService.resetCofre(USER_A)

  const db = getDatabase()
  for (const table of ['transactions', 'recurring_expenses', 'credit_card_payments', 'credit_cards', 'categories']) {
    assert.equal((await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`).get(USER_A)).count, 0)
  }
  assert.ok(await db.prepare('SELECT id FROM users WHERE id = ?').get(USER_A))
  assert.deepEqual(await db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_A), beforeSettings)
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM categories WHERE user_id = ?').get(USER_B)).count, 1)
})
