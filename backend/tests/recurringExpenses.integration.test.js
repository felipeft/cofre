const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-recurring-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = TEST_DB_PATH; process.env.LOG_LEVEL = 'error'
const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')
const USER_ID = 1
const categoryService = asUser(require('../src/services/category.service'), USER_ID)
const cardService = asUser(require('../src/services/card.service'), USER_ID)
const recurringService = asUser(require('../src/services/recurringExpense.service'), USER_ID)
const transactionService = asUser(require('../src/services/transaction.service'), USER_ID)

before(async () => { await ensureDatabaseReady(); await createTestUser({ id: USER_ID }) })
after(async () => { await closeDatabase(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true }) })
function expenseCategory() { return categoryService.createCategory({ name: 'Assinaturas', type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0 }) }
function input(categoryId, overrides = {}) { return { description: 'Spotify', amount: 34.9, categoryId, dayOfMonth: 10, startDate: '2030-08-01', endDate: null, isActive: true, cardId: null, notes: 'teste', ...overrides } }

describe('gastos recorrentes', () => {
  test('CRUD, geração, competência e idempotência são integrados', async () => {
    const category = await expenseCategory()
    const recurring = await recurringService.createRecurringExpense(input(category.id))
    assert.equal(recurring.type, 'expense')
    assert.equal((await recurringService.listRecurringExpenses({ includeInactive: false })).length, 1)
    assert.equal((await recurringService.getRecurringExpenseById(recurring.id)).id, recurring.id)
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-10-20' })
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-10-20' })
    const occurrences = (await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id })).data
    assert.deepEqual(occurrences.map((item) => item.date), ['2030-08-10', '2030-09-10', '2030-10-10'])
    assert.ok(occurrences.every((item) => item.recurringExpenseId === recurring.id && item.competence.month === Number(item.date.slice(5, 7))))
    await recurringService.updateRecurringExpense(recurring.id, { amount: 39.9 })
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2030-11-20' })
    const updated = (await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id })).data
    assert.equal(updated[0].amount, 34.9)
    assert.equal(updated.at(-1).amount, 39.9)
  })
  test('ocorrência cancelada não é recriada e cartão é propagado sem parcelas', async () => {
    const category = await categoryService.createCategory({ name: 'Serviços', type: 'expense', color: '#f2666a', icon: 'Wifi', isActive: true, sortOrder: 0 })
    const card = await cardService.createCard({ name: 'Cartão recorrente', creditLimit: 1000, closingDay: 10, dueDay: 20, isActive: true })
    const recurring = await recurringService.createRecurringExpense(input(category.id, { description: 'Internet', startDate: '2031-01-01', cardId: card.id }))
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-01-20' })
    const first = (await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id })).data[0]
    assert.equal(first.card.id, card.id); assert.equal(first.installments, null)
    await transactionService.updateTransaction(first.id, { status: 'cancelled' })
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-01-20' })
    const stillOne = (await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id })).data
    assert.equal(stillOne.length, 1)
    await recurringService.deleteRecurringExpense(recurring.id)
    await recurringService.ensureRecurringExpensesGenerated({ asOfDate: '2031-03-20' })
    assert.equal((await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id })).data.length, 1)
  })

  test('consultar mês futuro materializa recorrências até o período solicitado sem duplicar', async () => {
    const category = await categoryService.createCategory({ name: 'Previsões futuras', type: 'expense', color: '#5b9ef5', icon: 'CalendarClock', isActive: true, sortOrder: 0 })
    await recurringService.createRecurringExpense(input(category.id, { description: 'Assinatura futura', startDate: '2032-01-01' }))

    const march = await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id, month: 3, year: 2032 })
    assert.deepEqual(march.data.map((item) => item.date), ['2032-03-10'])

    const rangeQuery = { page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', categoryId: category.id, dateFrom: '2032-01-01', dateTo: '2032-03-31' }
    const firstRange = await transactionService.listTransactions(rangeQuery)
    const repeatedRange = await transactionService.listTransactions(rangeQuery)
    assert.deepEqual(firstRange.data.map((item) => item.date), ['2032-01-10', '2032-02-10', '2032-03-10'])
    assert.equal(repeatedRange.data.length, 3)
  })
})
