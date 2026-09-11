const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-deletion-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = TEST_DB_PATH; process.env.LOG_LEVEL = 'error'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')
const USER_ID = 1
const categoryService = asUser(require('../src/services/category.service'), USER_ID)
const transactionService = asUser(require('../src/services/transaction.service'), USER_ID)
const recurringService = asUser(require('../src/services/recurringExpense.service'), USER_ID)
const cardService = asUser(require('../src/services/card.service'), USER_ID)
const { ConflictError, NotFoundError } = require('../src/errors')

before(async () => { await ensureDatabaseReady(); await createTestUser({ id: USER_ID }) })
after(async () => { await closeDatabase(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true }) })
function category(name) { return categoryService.createCategory({ name, type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null }) }

test('DELETE de categoria é físico quando livre e é recusado quando há transações', async () => {
  const free = await category('Livre para apagar')
  await categoryService.deleteCategory(free.id)
  await assert.rejects(categoryService.getCategoryById(free.id), NotFoundError)
  await assert.doesNotReject(category('Livre para apagar'))

  const used = await category('Em uso')
  await transactionService.createTransaction({ description: 'Despesa', amount: 10, type: 'expense', categoryId: used.id, date: '2030-01-01', notes: '', source: 'manual', isRecurring: false, isFixed: false, tags: [], status: 'confirmed' })
  await assert.rejects(categoryService.deleteCategory(used.id), ConflictError)
  assert.equal((await getDatabase().prepare('SELECT is_active FROM categories WHERE id = ?').get(used.id)).is_active, 1)
})

test('DELETE de recorrência é desativação explícita e preserva ocorrências', async () => {
  const expenseCategory = await category('Recorrência')
  const recurring = await recurringService.createRecurringExpense({ description: 'Serviço', amount: 20, categoryId: expenseCategory.id, dayOfMonth: 10, startDate: '2030-01-01', endDate: null, isActive: true, cardId: null, notes: '' })
  await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-01-20' })
  await recurringService.deleteRecurringExpense(recurring.id)
  assert.equal((await getDatabase().prepare('SELECT is_active FROM recurring_expenses WHERE id = ?').get(recurring.id)).is_active, 0)
  assert.equal((await getDatabase().prepare('SELECT count(*) AS count FROM transactions WHERE recurring_expense_id = ?').get(recurring.id)).count, 1)
})

test('categoria e cartão vinculados a uma regra recorrente não podem ser apagados', async () => {
  const expenseCategory = await category('Vínculos recorrentes')
  const card = await cardService.createCard({ name: 'Cartão da recorrência', creditLimit: 500, closingDay: 10, dueDay: 20, isActive: true })
  await recurringService.createRecurringExpense({ description: 'Assinatura futura', amount: 20, categoryId: expenseCategory.id, dayOfMonth: 10, startDate: '2099-01-01', endDate: null, isActive: true, cardId: card.id, notes: '' })

  await assert.rejects(categoryService.deleteCategory(expenseCategory.id), ConflictError)
  await assert.rejects(cardService.deleteCard(card.id), ConflictError)
})
