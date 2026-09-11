const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'

const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')
const { ConflictError } = require('../src/errors')

const USER_ID = 1
const categoryService = asUser(require('../src/services/category.service'), USER_ID)
const transactionService = asUser(require('../src/services/transaction.service'), USER_ID)

before(async () => { await ensureDatabaseReady(); await createTestUser({ id: USER_ID }) })
after(async () => {
  await closeDatabase()
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true })
})

function category(name, type = 'income') {
  return categoryService.createCategory({
    name, type, color: type === 'income' ? '#3ecf8e' : '#f2666a',
    icon: type === 'income' ? 'Wallet' : 'ShoppingCart', isActive: true, sortOrder: 0,
  })
}

function transaction(categoryId, overrides = {}) {
  return {
    description: 'Movimentação', amount: 1000, type: 'income', categoryId,
    date: '2030-05-05', notes: '', source: 'manual', isRecurring: false,
    isFixed: false, tags: [], status: 'confirmed', ...overrides,
  }
}

describe('categorias e histórico', () => {
  test('não permite duas categorias do mesmo tipo com o mesmo nome', async () => {
    await category('Bolsa')
    await assert.rejects(category('bolsa'), ConflictError)
  })

  test('editar uma receita altera a mesma transação e não cria outra', async () => {
    const source = await category('Emprego')
    const created = await transactionService.createTransaction(transaction(source.id))
    const updated = await transactionService.updateTransaction(created.id, { amount: 2500 })
    assert.equal(updated.id, created.id)
    assert.equal(updated.amount, 2500)
    const list = await transactionService.listTransactions({ page: 1, limit: 50, sortBy: 'date', sortDir: 'desc', categoryId: source.id })
    assert.equal(list.data.length, 1)
  })

  test('transação de categoria desativada permanece consultável', async () => {
    const source = await category('Projeto antigo')
    const historic = await transactionService.createTransaction(transaction(source.id, { amount: 1200, date: '2025-03-10' }))
    await categoryService.updateCategory(source.id, { isActive: false })
    assert.ok(!(await categoryService.listCategories({ includeInactive: false })).some((item) => item.id === source.id))
    const stored = await transactionService.getTransactionById(historic.id)
    assert.equal(stored.amount, 1200)
    assert.equal(stored.category.id, source.id)
  })
})

describe('despesas recorrentes e resumo', () => {
  test('recorrência é um campo da transação, não uma inferência do texto', async () => {
    const expense = await category('Assinaturas e Contas', 'expense')
    const recurring = await transactionService.createTransaction(transaction(expense.id, { type: 'expense', description: 'Serviço mensal', amount: 120, isRecurring: true, isFixed: true }))
    const oneOff = await transactionService.createTransaction(transaction(expense.id, { type: 'expense', description: 'Serviço mensal', amount: 45 }))
    assert.equal(recurring.isRecurring, true)
    assert.equal(recurring.isFixed, true)
    assert.equal(oneOff.isRecurring, false)
  })

  test('saldo é calculado somente por receitas menos despesas', async () => {
    const income = await category('Receitas do resumo')
    const expense = await category('Despesas do resumo', 'expense')
    await transactionService.createTransaction(transaction(income.id, { amount: 2000, date: '2040-05-05' }))
    await transactionService.createTransaction(transaction(expense.id, { type: 'expense', amount: 300, date: '2040-05-10' }))
    assert.deepEqual(await transactionService.getFinancialSummary({ month: 5, year: 2040 }), {
      totalIncome: 2000, totalExpenses: 300, balance: 1700,
    })
  })

  test('resumo funciona para qualquer ano', async () => {
    const income = await category('Receita futura')
    await transactionService.createTransaction(transaction(income.id, { amount: 100, date: '2032-01-01' }))
    assert.equal((await transactionService.getFinancialSummary({ month: 1, year: 2032 })).totalIncome, 100)
  })
})
