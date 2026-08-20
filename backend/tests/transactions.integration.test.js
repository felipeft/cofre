// Testes de integração: chamam os Services de verdade (sem subir HTTP),
// contra um banco SQLite temporário e isolado — criado e migrado do zero a
// cada execução, apagado ao final. As variáveis de ambiente precisam ser
// definidas ANTES de qualquer require do restante do backend, porque
// config/index.js lê `process.env` uma única vez, no momento em que é
// importado pela primeira vez.
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error' // silencia logs de info durante os testes

const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')

const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const categoryService = require('../src/services/category.service')
const transactionService = require('../src/services/transaction.service')
const { ValidationError, ConflictError } = require('../src/errors')

before(() => {
  ensureDatabaseReady()
})

after(() => {
  closeDatabase()
  fs.rmSync(TEST_DB_PATH, { force: true })
  fs.rmSync(`${TEST_DB_PATH}-shm`, { force: true })
  fs.rmSync(`${TEST_DB_PATH}-wal`, { force: true })
})

describe('Regras financeiras — categorias como fontes de renda', () => {
  test('categoria de despesa não pode ativar oferta/dízimo', () => {
    assert.throws(
      () =>
        categoryService.createCategory({
          name: 'Mercado',
          type: 'expense',
          color: '#f2666a',
          icon: 'ShoppingCart',
          isActive: true,
          sortOrder: 0,
          applyOffer: true,
          offerRate: null,
          applyTithe: false,
          titheRate: null,
        }),
      ValidationError
    )
  })

  test('não permite duas categorias de receita com o mesmo nome', () => {
    categoryService.createCategory(baseCategory({ name: 'Bolsa', applyOffer: true, applyTithe: true }))
    assert.throws(() => categoryService.createCategory(baseCategory({ name: 'bolsa' })), ConflictError)
  })
})

describe('Caso 6 — atualizar uma receita não duplica a obrigação calculada', () => {
  test('editar o valor recalcula oferta/dízimo na MESMA transação, nunca cria outra', () => {
    const emprego = categoryService.createCategory(
      baseCategory({ name: 'Emprego CLT', applyOffer: true, applyTithe: true })
    )

    const created = transactionService.createTransaction({
      description: 'Salário',
      amount: 10000,
      type: 'income',
      categoryId: emprego.id,
      date: '2026-07-05',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })
    assert.equal(created.offerAmount, 100)
    assert.equal(created.titheAmount, 1000)

    const updated = transactionService.updateTransaction(created.id, { amount: 2500 })
    assert.equal(updated.id, created.id, 'mesma linha, não uma nova transação')
    assert.equal(updated.offerAmount, 25)
    assert.equal(updated.titheAmount, 250)

    // Reaplicar a mesma edição de novo (idempotência) não deve mudar nada.
    const updatedAgain = transactionService.updateTransaction(created.id, { amount: 2500 })
    assert.equal(updatedAgain.offerAmount, 25)
    assert.equal(updatedAgain.titheAmount, 250)

    const list = transactionService.listTransactions({
      page: 1,
      limit: 50,
      sortBy: 'date',
      sortDir: 'desc',
      categoryId: emprego.id,
    })
    assert.equal(list.data.length, 1, 'nunca existiu uma segunda transação de obrigação')
  })
})

describe('Caso 7 — histórico sobrevive à desativação da fonte', () => {
  test('transação de uma fonte desativada continua consultável e com valores intactos', () => {
    const supremus = categoryService.createCategory(
      baseCategory({ name: 'Supremus Service', applyOffer: true, applyTithe: true })
    )

    const historic = transactionService.createTransaction({
      description: 'Projeto antigo',
      amount: 1200,
      type: 'income',
      categoryId: supremus.id,
      date: '2025-03-10',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })

    // "Supremus Service não gera renda há meses" -> desativa, não apaga.
    const deactivated = categoryService.updateCategory(supremus.id, { isActive: false })
    assert.equal(deactivated.isActive, false)

    // Some da listagem padrão...
    const activeOnly = categoryService.listCategories({ includeInactive: false })
    assert.ok(!activeOnly.some((c) => c.id === supremus.id))

    // ...mas continua existindo e consultável explicitamente.
    const stillThere = categoryService.getCategoryById(supremus.id)
    assert.equal(stillThere.id, supremus.id)

    // E a transação histórica não foi tocada.
    const stillConsultable = transactionService.getTransactionById(historic.id)
    assert.equal(stillConsultable.amount, 1200)
    assert.equal(stillConsultable.offerAmount, 12)
    assert.equal(stillConsultable.titheAmount, 120)
    assert.equal(stillConsultable.category.id, supremus.id)
  })

  test('mudar a taxa da fonte HOJE não altera obrigações já calculadas no passado', () => {
    const freela = categoryService.createCategory(
      baseCategory({ name: 'Freelancer', applyOffer: true, offerRate: 0.01, applyTithe: true, titheRate: 0.1 })
    )

    const past = transactionService.createTransaction({
      description: 'Projeto X',
      amount: 1000,
      type: 'income',
      categoryId: freela.id,
      date: '2025-01-15',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })
    assert.equal(past.offerAmount, 10)
    assert.equal(past.titheAmount, 100)

    // A taxa da fonte muda hoje...
    categoryService.updateCategory(freela.id, { offerRate: 0.05, titheRate: 0.2 })

    // ...mas o registro histórico permanece com os valores originais —
    // exatamente a garantia que o domínio precisa dar (ver README).
    const untouched = transactionService.getTransactionById(past.id)
    assert.equal(untouched.offerAmount, 10)
    assert.equal(untouched.titheAmount, 100)

    // Uma NOVA transação, sim, já usa a taxa atualizada.
    const future = transactionService.createTransaction({
      description: 'Projeto Y',
      amount: 1000,
      type: 'income',
      categoryId: freela.id,
      date: '2026-08-01',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })
    assert.equal(future.offerAmount, 50)
    assert.equal(future.titheAmount, 200)
  })
})

describe('Caso 8 — despesa recorrente representável sem depender do nome', () => {
  test('is_recurring é uma propriedade da transação, não uma inferência do texto', () => {
    const internet = categoryService.createCategory({
      name: 'Assinaturas e Contas',
      type: 'expense',
      color: '#5b9ef5',
      icon: 'RefreshCw',
      isActive: true,
      sortOrder: 0,
      applyOffer: false,
      offerRate: null,
      applyTithe: false,
      titheRate: null,
    })

    // Duas despesas na MESMA categoria, mesmo texto de descrição — uma
    // marcada recorrente, outra não. A diferença é o campo, não o nome.
    const recurring = transactionService.createTransaction({
      description: 'Serviço mensal',
      amount: 120,
      type: 'expense',
      categoryId: internet.id,
      date: '2026-07-10',
      notes: '',
      source: 'manual',
      isRecurring: true,
      isFixed: true,
      tags: [],
      status: 'confirmed',
    })
    const oneOff = transactionService.createTransaction({
      description: 'Serviço mensal',
      amount: 45,
      type: 'expense',
      categoryId: internet.id,
      date: '2026-07-18',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })

    assert.equal(recurring.isRecurring, true)
    assert.equal(recurring.isFixed, true)
    assert.equal(oneOff.isRecurring, false)
    // Nenhuma obrigação de oferta/dízimo em despesa, recorrente ou não.
    assert.equal(recurring.offerAmount, 0)
    assert.equal(oneOff.offerAmount, 0)
  })
})

describe('Resumo financeiro (GET /transactions/summary)', () => {
  test('separa oferta/dízimo de despesas e não conta em dobro', () => {
    const pai = categoryService.createCategory(baseCategory({ name: 'Pai (resumo)', applyOffer: true, applyTithe: false }))
    const mercado = categoryService.createCategory({
      name: 'Mercado (resumo)',
      type: 'expense',
      color: '#f2666a',
      icon: 'ShoppingCart',
      isActive: true,
      sortOrder: 0,
      applyOffer: false,
      offerRate: null,
      applyTithe: false,
      titheRate: null,
    })

    transactionService.createTransaction({
      description: 'Ajuda',
      amount: 2000,
      type: 'income',
      categoryId: pai.id,
      date: '2030-05-05',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })
    transactionService.createTransaction({
      description: 'Feira',
      amount: 300,
      type: 'expense',
      categoryId: mercado.id,
      date: '2030-05-10',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })

    const summary = transactionService.getFinancialSummary({ month: 5, year: 2030 })
    assert.equal(summary.totalIncome, 2000)
    assert.equal(summary.totalExpenses, 300)
    assert.equal(summary.offerAmount, 20)
    assert.equal(summary.titheAmount, 0)
    assert.equal(summary.offerAndTitheTotal, 20)
    assert.equal(summary.balance, 1680) // 2000 - 300 - 20
  })

  test('funciona para qualquer ano, não só 2026', () => {
    const cat = categoryService.createCategory(baseCategory({ name: 'Fonte futura', applyOffer: true, applyTithe: true }))
    transactionService.createTransaction({
      description: 'Renda futura',
      amount: 100,
      type: 'income',
      categoryId: cat.id,
      date: '2032-01-01',
      notes: '',
      source: 'manual',
      isRecurring: false,
      isFixed: false,
      tags: [],
      status: 'confirmed',
    })
    const summary = transactionService.getFinancialSummary({ month: 1, year: 2032 })
    assert.equal(summary.totalIncome, 100)
  })
})

function baseCategory(overrides = {}) {
  return {
    name: 'Categoria de teste',
    type: 'income',
    color: '#3ecf8e',
    icon: 'Wallet',
    isActive: true,
    sortOrder: 0,
    applyOffer: false,
    offerRate: null,
    applyTithe: false,
    titheRate: null,
    ...overrides,
  }
}
