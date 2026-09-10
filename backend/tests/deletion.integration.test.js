const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-deletion-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = TEST_DB_PATH; process.env.LOG_LEVEL = 'error'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const categoryService = require('../src/services/category.service')
const transactionService = require('../src/services/transaction.service')
const recurringService = require('../src/services/recurringExpense.service')
const { ConflictError, NotFoundError } = require('../src/errors')

before(() => ensureDatabaseReady())
after(() => { closeDatabase(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true }) })
function category(name) { return categoryService.createCategory({ name, type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null }) }

test('DELETE de categoria é físico quando livre e é recusado quando há transações', () => {
  const free = category('Livre para apagar')
  categoryService.deleteCategory(free.id)
  assert.throws(() => categoryService.getCategoryById(free.id), NotFoundError)
  assert.doesNotThrow(() => category('Livre para apagar'))

  const used = category('Em uso')
  transactionService.createTransaction({ description: 'Despesa', amount: 10, type: 'expense', categoryId: used.id, date: '2030-01-01', notes: '', source: 'manual', isRecurring: false, isFixed: false, tags: [], status: 'confirmed' })
  assert.throws(() => categoryService.deleteCategory(used.id), ConflictError)
  assert.equal(getDatabase().prepare('SELECT is_active FROM categories WHERE id = ?').get(used.id).is_active, 1)
})

test('DELETE de recorrência é desativação explícita e preserva ocorrências', () => {
  const expenseCategory = category('Recorrência')
  const recurring = recurringService.createRecurringExpense({ description: 'Serviço', amount: 20, categoryId: expenseCategory.id, dayOfMonth: 10, startDate: '2030-01-01', endDate: null, isActive: true, cardId: null, notes: '' })
  recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-01-20' })
  recurringService.deleteRecurringExpense(recurring.id)
  assert.equal(getDatabase().prepare('SELECT is_active FROM recurring_expenses WHERE id = ?').get(recurring.id).is_active, 0)
  assert.equal(getDatabase().prepare('SELECT count(*) AS count FROM transactions WHERE recurring_expense_id = ?').get(recurring.id).count, 1)
})
