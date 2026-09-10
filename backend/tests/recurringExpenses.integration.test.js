const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-recurring-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = TEST_DB_PATH; process.env.LOG_LEVEL = 'error'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const categoryService = require('../src/services/category.service')
const cardService = require('../src/services/card.service')
const recurringService = require('../src/services/recurringExpense.service')
const transactionService = require('../src/services/transaction.service')

before(() => ensureDatabaseReady())
after(() => { closeDatabase(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true }) })
function expenseCategory() { return categoryService.createCategory({ name: 'Assinaturas', type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null }) }
function input(categoryId, overrides = {}) { return { description: 'Spotify', amount: 34.9, categoryId, dayOfMonth: 10, startDate: '2030-08-01', endDate: null, isActive: true, cardId: null, notes: 'teste', ...overrides } }

describe('gastos recorrentes', () => {
  test('CRUD, geração, competência e idempotência são integrados', () => {
    const category = expenseCategory()
    const recurring = recurringService.createRecurringExpense(input(category.id))
    assert.equal(recurring.type, 'expense')
    assert.equal(recurringService.listRecurringExpenses({ includeInactive: false }).length, 1)
    assert.equal(recurringService.getRecurringExpenseById(recurring.id).id, recurring.id)
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-10-20' })
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-10-20' })
    const occurrences = transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id }).data
    assert.deepEqual(occurrences.map((item) => item.date), ['2030-08-10', '2030-09-10', '2030-10-10'])
    assert.ok(occurrences.every((item) => item.recurringExpenseId === recurring.id && item.competence.month === Number(item.date.slice(5, 7))))
    recurringService.updateRecurringExpense(recurring.id, { amount: 39.9 })
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-11-20' })
    const updated = transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id }).data
    assert.equal(updated[0].amount, 34.9)
    assert.equal(updated.at(-1).amount, 39.9)
  })
  test('ocorrência cancelada não é recriada e cartão é propagado sem parcelas', () => {
    const category = categoryService.createCategory({ name: 'Serviços', type: 'expense', color: '#f2666a', icon: 'Wifi', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null })
    const card = cardService.createCard({ name: 'Cartão recorrente', creditLimit: 1000, closingDay: 10, dueDay: 20, isActive: true })
    const recurring = recurringService.createRecurringExpense(input(category.id, { description: 'Internet', startDate: '2031-01-01', cardId: card.id }))
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-01-20' })
    const first = transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id }).data[0]
    assert.equal(first.card.id, card.id); assert.equal(first.installments, null)
    transactionService.updateTransaction(first.id, { status: 'cancelled' })
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-01-20' })
    const stillOne = transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id }).data
    assert.equal(stillOne.length, 1)
    recurringService.deleteRecurringExpense(recurring.id)
    recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-03-20' })
    assert.equal(transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id }).data.length, 1)
  })
})
