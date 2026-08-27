const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-cards-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'

const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')

const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const categoryService = require('../src/services/category.service')
const cardService = require('../src/services/card.service')
const transactionService = require('../src/services/transaction.service')
const transactionRepository = require('../src/repositories/transaction.repository')
const { ValidationError, NotFoundError, ConflictError } = require('../src/errors')

before(() => {
  ensureDatabaseReady()
})

after(() => {
  closeDatabase()
  fs.rmSync(TEST_DB_PATH, { force: true })
  fs.rmSync(`${TEST_DB_PATH}-shm`, { force: true })
  fs.rmSync(`${TEST_DB_PATH}-wal`, { force: true })
})

function baseCard(overrides = {}) {
  return { name: 'Cartão de teste', creditLimit: 5000, closingDay: 10, dueDay: 20, isActive: true, ...overrides }
}

function baseTransaction(overrides = {}) {
  return {
    description: '',
    amount: 100,
    type: 'expense',
    categoryId: null,
    date: '2026-08-05',
    cardId: null,
    notes: '',
    source: 'manual',
    isRecurring: false,
    isFixed: false,
    tags: [],
    status: 'confirmed',
    ...overrides,
  }
}

function expenseCategory(overrides = {}) {
  return categoryService.createCategory({
    name: 'Categoria de teste',
    type: 'expense',
    color: '#f2666a',
    icon: 'ShoppingCart',
    isActive: true,
    sortOrder: 0,
    applyOffer: false,
    offerRate: null,
    applyTithe: false,
    titheRate: null,
    ...overrides,
  })
}

function incomeCategory(overrides = {}) {
  return categoryService.createCategory({
    name: 'Salário de teste',
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
  })
}

describe('CRUD de cartões', () => {
  test('1. criar cartão', () => {
    const card = cardService.createCard(baseCard({ name: 'Nubank teste' }))
    assert.equal(card.name, 'Nubank teste')
    assert.equal(card.creditLimit, 5000)
    assert.equal(card.isActive, true)
  })

  test('2. listar cartões', () => {
    cardService.createCard(baseCard({ name: 'Itaú teste' }))
    const list = cardService.listCards({ includeInactive: false })
    assert.ok(list.some((c) => c.name === 'Itaú teste'))
  })

  test('3. buscar cartão por id', () => {
    const created = cardService.createCard(baseCard({ name: 'Bradesco teste' }))
    const found = cardService.getCardById(created.id)
    assert.equal(found.id, created.id)
  })

  test('4. editar cartão', () => {
    const created = cardService.createCard(baseCard({ name: 'Santander teste' }))
    const updated = cardService.updateCard(created.id, { creditLimit: 8000 })
    assert.equal(updated.creditLimit, 8000)
    assert.equal(updated.name, 'Santander teste', 'campos não tocados permanecem intactos')
  })

  test('5. desativar/excluir cartão sem uso -> exclusão física', () => {
    const created = cardService.createCard(baseCard({ name: 'C6 teste' }))
    const result = cardService.deleteCard(created.id)
    assert.equal(result.softDeleted, false)
    assert.throws(() => cardService.getCardById(created.id), NotFoundError)
  })

  test('6. cartão em uso -> desativação lógica, não exclusão', () => {
    const card = cardService.createCard(baseCard({ name: 'Inter teste' }))
    const category = expenseCategory({ name: 'Categoria Inter teste' })
    transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id }))

    const result = cardService.deleteCard(card.id)
    assert.equal(result.softDeleted, true)
    assert.equal(cardService.getCardById(card.id).isActive, false, 'continua existindo, só desativado')
  })

  test('7. rejeitar cartão inexistente (404)', () => {
    assert.throws(() => cardService.getCardById(999999), NotFoundError)
  })

  test('não permite dois cartões com o mesmo nome', () => {
    cardService.createCard(baseCard({ name: 'Duplicado teste' }))
    assert.throws(() => cardService.createCard(baseCard({ name: 'duplicado teste' })), ConflictError)
  })
})

describe('Transações com cartão e parcelamento', () => {
  test('8. criar despesa normal (sem cartão) continua funcionando', () => {
    const category = expenseCategory({ name: 'Mercado teste' })
    const tx = transactionService.createTransaction(baseTransaction({ description: 'Feira', amount: 150, categoryId: category.id }))
    assert.equal(tx.card, null)
    assert.equal(tx.installments, null)
  })

  test('9. criar despesa 1x no cartão -> uma única transação', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão 1x teste' }))
    const category = expenseCategory({ name: 'Categoria 1x teste' })
    const tx = transactionService.createTransaction(
      baseTransaction({ description: 'Compra à vista', amount: 200, categoryId: category.id, cardId: card.id })
    )
    assert.equal(tx.card.id, card.id)
    assert.equal(tx.installments, null, '1x não gera grupo de parcelas')
  })

  test('10-17. compra parcelada 12x: quantidade, installmentCurrent/Total, groupId, cardId, datas, soma', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão 12x teste', closingDay: 10, dueDay: 20 }))
    const category = expenseCategory({ name: 'Eletrônicos teste' })

    const result = transactionService.createTransaction(
      baseTransaction({
        description: 'Notebook',
        amount: 1200,
        categoryId: category.id,
        date: '2026-08-20',
        cardId: card.id,
        installmentTotal: 12,
      })
    )

    assert.equal(result.count, 12)
    assert.equal(result.transactions.length, 12)

    result.transactions.forEach((t, i) => {
      assert.equal(t.installments.current, i + 1)
      assert.equal(t.installments.total, 12)
    })

    const groupIds = new Set(result.transactions.map((t) => t.installments.groupId))
    assert.equal(groupIds.size, 1)
    assert.equal(result.installmentGroupId, [...groupIds][0])

    assert.ok(result.transactions.every((t) => t.card.id === card.id))

    assert.equal(result.transactions[0].date, '2026-09-20')
    assert.equal(result.transactions[11].date, '2027-08-20')

    const sum = result.transactions.reduce((s, t) => s + t.amount, 0)
    assert.equal(sum, 1200)
    assert.ok(result.transactions.every((t) => t.amount > 0))

    const listed = transactionService.listTransactions({
      page: 1,
      limit: 50,
      sortBy: 'date',
      sortDir: 'asc',
      installmentGroupId: result.installmentGroupId,
    })
    assert.equal(listed.meta.total, 12, 'exatamente 12 parcelas — nenhuma 13ª linha "original"')
  })

  test('18. arredondamento de centavos: soma sempre bate com o valor original', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão arredondamento teste' }))
    const category = expenseCategory({ name: 'Categoria arredondamento teste' })

    const result = transactionService.createTransaction(
      baseTransaction({ description: 'Compra ímpar', amount: 100, categoryId: category.id, cardId: card.id, installmentTotal: 3 })
    )

    const sum = result.transactions.reduce((s, t) => s + t.amount, 0)
    assert.equal(sum, 100)
  })

  test('19. não permite parcelamento (nem uso simples) de receita', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão receita teste' }))
    const category = incomeCategory({ name: 'Salário parcelamento teste' })

    assert.throws(
      () =>
        transactionService.createTransaction(
          baseTransaction({ type: 'income', amount: 1000, categoryId: category.id, cardId: card.id, installmentTotal: 5 })
        ),
      ValidationError
    )
  })

  test('20. não permite uso de cartão inativo', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão inativo teste' }))
    cardService.updateCard(card.id, { isActive: false })
    const category = expenseCategory({ name: 'Categoria cartão inativo teste' })

    assert.throws(
      () => transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id })),
      ValidationError
    )
  })

  test('cartão inexistente é rejeitado (404) ao criar transação', () => {
    const category = expenseCategory({ name: 'Categoria cartão 404 teste' })
    assert.throws(
      () => transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: 999999 })),
      NotFoundError
    )
  })
})

describe('21. Limite utilizado do cartão', () => {
  test('limite reflete as parcelas em aberto do cartão', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão limite teste', creditLimit: 5000 }))
    const category = expenseCategory({ name: 'Categoria limite teste' })

    transactionService.createTransaction(
      baseTransaction({ description: 'Compra parcelada', amount: 1200, categoryId: category.id, cardId: card.id, installmentTotal: 12 })
    )

    const summary = cardService.getCardSummary(card.id)
    assert.equal(summary.creditLimit, 5000)
    assert.equal(summary.usedLimit, 1200)
    assert.equal(summary.availableLimit, 3800)
  })

  test('transação cancelada não conta no limite utilizado', () => {
    const card = cardService.createCard(baseCard({ name: 'Cartão cancelado teste', creditLimit: 2000 }))
    const category = expenseCategory({ name: 'Categoria cancelado teste' })

    const tx = transactionService.createTransaction(
      baseTransaction({ description: 'Compra que será cancelada', amount: 500, categoryId: category.id, cardId: card.id })
    )
    transactionService.updateTransaction(tx.id, { status: 'cancelled' })

    const summary = cardService.getCardSummary(card.id)
    assert.equal(summary.usedLimit, 0)
  })
})

describe('22. Atomicidade da criação de parcelas', () => {
  test('erro no meio da geração não deixa nenhuma parcela salva parcialmente', () => {
    const category = expenseCategory({ name: 'Categoria atomicidade teste' })
    const db = getDatabase()
    const countBefore = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n

    // Simula uma falha no meio do lote no nível do repository (onde a
    // atomicidade de verdade é garantida): a segunda linha referencia uma
    // categoria inexistente, o que viola a FK e deve reverter TODAS as
    // inserções desta mesma chamada.
    const rows = [
      {
        description: 'ok 1',
        amount: 10,
        type: 'expense',
        categoryId: category.id,
        date: '2026-08-05',
        competenceMonth: 8,
        competenceYear: 2026,
        notes: '',
        source: 'manual',
        isRecurring: false,
        isFixed: false,
        card: null,
        cardId: null,
        installmentCurrent: 1,
        installmentTotal: 2,
        installmentGroupId: 'atomic-test-group',
        tags: '[]',
        status: 'confirmed',
      },
      {
        description: 'quebra aqui',
        amount: 10,
        type: 'expense',
        categoryId: 999999999,
        date: '2026-09-05',
        competenceMonth: 9,
        competenceYear: 2026,
        notes: '',
        source: 'manual',
        isRecurring: false,
        isFixed: false,
        card: null,
        cardId: null,
        installmentCurrent: 2,
        installmentTotal: 2,
        installmentGroupId: 'atomic-test-group',
        tags: '[]',
        status: 'confirmed',
      },
    ]

    assert.throws(() => transactionRepository.createMany(rows))

    const countAfter = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n
    assert.equal(countAfter, countBefore, 'nenhuma linha do lote deve ter sido persistida')

    const leftover = db
      .prepare("SELECT COUNT(*) AS n FROM transactions WHERE installment_group_id = 'atomic-test-group'")
      .get().n
    assert.equal(leftover, 0)
  })
})
