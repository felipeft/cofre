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
const { createTestUser, asUser } = require('./helpers/userScope')
const USER_ID = 1
const categoryService = asUser(require('../src/services/category.service'), USER_ID)
const cardService = asUser(require('../src/services/card.service'), USER_ID)
const transactionService = asUser(require('../src/services/transaction.service'), USER_ID)
const transactionRepository = asUser(require('../src/repositories/transaction.repository'), USER_ID)
const { ValidationError, NotFoundError, ConflictError } = require('../src/errors')

before(async () => {
  await ensureDatabaseReady()
  await createTestUser({ id: USER_ID })
})

after(async () => {
  await closeDatabase()
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
  test('1. criar cartão', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Nubank teste' }))
    assert.equal(card.name, 'Nubank teste')
    assert.equal(card.creditLimit, 5000)
    assert.equal(card.isActive, true)
  })

  test('2. listar cartões', async () => {
    await cardService.createCard(baseCard({ name: 'Itaú teste' }))
    const list = await cardService.listCards({ includeInactive: false })
    assert.ok(list.some((c) => c.name === 'Itaú teste'))
  })

  test('3. buscar cartão por id', async () => {
    const created = await cardService.createCard(baseCard({ name: 'Bradesco teste' }))
    const found = await cardService.getCardById(created.id)
    assert.equal(found.id, created.id)
  })

  test('4. editar cartão', async () => {
    const created = await cardService.createCard(baseCard({ name: 'Santander teste' }))
    const updated = await cardService.updateCard(created.id, { creditLimit: 8000 })
    assert.equal(updated.creditLimit, 8000)
    assert.equal(updated.name, 'Santander teste', 'campos não tocados permanecem intactos')
  })

  test('5. excluir cartão sem uso remove fisicamente e libera o mesmo nome', async () => {
    const created = await cardService.createCard(baseCard({ name: 'C6 teste' }))
    await cardService.deleteCard(created.id)
    await assert.rejects(cardService.getCardById(created.id), NotFoundError)
    await assert.doesNotReject(cardService.createCard(baseCard({ name: 'C6 teste' })))
  })

  test('6. cartão em uso não some: DELETE é recusado e o registro persiste', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Inter teste' }))
    const category = await expenseCategory({ name: 'Categoria Inter teste' })
    await transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id }))

    await assert.rejects(cardService.deleteCard(card.id), ConflictError)
    assert.equal((await cardService.getCardById(card.id)).isActive, true, 'continua visível e ativo após DELETE recusado')
  })

  test('7. rejeitar cartão inexistente (404)', async () => {
    await assert.rejects(cardService.getCardById(999999), NotFoundError)
  })

  test('não permite dois cartões com o mesmo nome', async () => {
    await cardService.createCard(baseCard({ name: 'Duplicado teste' }))
    await assert.rejects(cardService.createCard(baseCard({ name: 'duplicado teste' })), ConflictError)
  })
})

describe('Transações com cartão e parcelamento', () => {
  test('8. criar despesa normal (sem cartão) continua funcionando', async () => {
    const category = await expenseCategory({ name: 'Mercado teste' })
    const tx = await transactionService.createTransaction(baseTransaction({ description: 'Feira', amount: 150, categoryId: category.id }))
    assert.equal(tx.card, null)
    assert.equal(tx.installments, null)
  })

  test('9. criar despesa 1x no cartão -> uma única transação', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão 1x teste' }))
    const category = await expenseCategory({ name: 'Categoria 1x teste' })
    const tx = await transactionService.createTransaction(
      baseTransaction({ description: 'Compra à vista', amount: 200, categoryId: category.id, cardId: card.id })
    )
    assert.equal(tx.card.id, card.id)
    assert.equal(tx.installments, null, '1x não gera grupo de parcelas')
  })

  test('10-17. compra parcelada 12x: quantidade, installmentCurrent/Total, groupId, cardId, datas, soma', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão 12x teste', closingDay: 10, dueDay: 20 }))
    const category = await expenseCategory({ name: 'Eletrônicos teste' })

    const result = await transactionService.createTransaction(
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

    const listed = await transactionService.listTransactions({
      page: 1,
      limit: 50,
      sortBy: 'date',
      sortDir: 'asc',
      installmentGroupId: result.installmentGroupId,
    })
    assert.equal(listed.meta.total, 12, 'exatamente 12 parcelas — nenhuma 13ª linha "original"')
  })

  test('18. arredondamento de centavos: soma sempre bate com o valor original', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão arredondamento teste' }))
    const category = await expenseCategory({ name: 'Categoria arredondamento teste' })

    const result = await transactionService.createTransaction(
      baseTransaction({ description: 'Compra ímpar', amount: 100, categoryId: category.id, cardId: card.id, installmentTotal: 3 })
    )

    const sum = result.transactions.reduce((s, t) => s + t.amount, 0)
    assert.equal(sum, 100)
  })

  test('19. não permite parcelamento (nem uso simples) de receita', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão receita teste' }))
    const category = await incomeCategory({ name: 'Salário parcelamento teste' })

    await assert.rejects(
      transactionService.createTransaction(
          baseTransaction({ type: 'income', amount: 1000, categoryId: category.id, cardId: card.id, installmentTotal: 5 })
        ),
      ValidationError
    )
  })

  test('20. não permite uso de cartão inativo', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão inativo teste' }))
    await cardService.updateCard(card.id, { isActive: false })
    const category = await expenseCategory({ name: 'Categoria cartão inativo teste' })

    await assert.rejects(
      transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id })),
      ValidationError
    )
  })

  test('cartão inexistente é rejeitado (404) ao criar transação', async () => {
    const category = await expenseCategory({ name: 'Categoria cartão 404 teste' })
    await assert.rejects(
      transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: 999999 })),
      NotFoundError
    )
  })
})

describe('21. Limite utilizado do cartão', () => {
  test('limite reflete as parcelas em aberto do cartão', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão limite teste', creditLimit: 5000 }))
    const category = await expenseCategory({ name: 'Categoria limite teste' })

    await transactionService.createTransaction(
      baseTransaction({ description: 'Compra parcelada', amount: 1200, categoryId: category.id, cardId: card.id, installmentTotal: 12 })
    )

    const summary = await cardService.getCardSummary(card.id)
    assert.equal(summary.creditLimit, 5000)
    assert.equal(summary.usedLimit, 1200)
    assert.equal(summary.availableLimit, 3800)
  })

  test('transação cancelada não conta no limite utilizado', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão cancelado teste', creditLimit: 2000 }))
    const category = await expenseCategory({ name: 'Categoria cancelado teste' })

    const tx = await transactionService.createTransaction(
      baseTransaction({ description: 'Compra que será cancelada', amount: 500, categoryId: category.id, cardId: card.id })
    )
    await transactionService.updateTransaction(tx.id, { status: 'cancelled' })

    const summary = await cardService.getCardSummary(card.id)
    assert.equal(summary.usedLimit, 0)
  })

  test('excluir transação remove a linha do banco e deixa de consumir o limite', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão delete transação', creditLimit: 1000 }))
    const category = await expenseCategory({ name: 'Categoria delete transação' })
    const transaction = await transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id, amount: 123.45 }))
    assert.equal((await cardService.getCardSummary(card.id)).usedLimit, 123.45)
    await transactionService.deleteTransaction(transaction.id)
    assert.equal((await cardService.getCardSummary(card.id)).usedLimit, 0)
    await assert.rejects(transactionService.getTransactionById(transaction.id), NotFoundError)
    await assert.doesNotReject(cardService.deleteCard(card.id))
  })

  test('pagamento manual da fatura quita o limite uma vez e não cria transação duplicada', async () => {
    const card = await cardService.createCard(baseCard({ name: 'Cartão pagamento teste', creditLimit: 1000 }))
    const category = await expenseCategory({ name: 'Categoria pagamento teste' })
    const purchase = await transactionService.createTransaction(baseTransaction({ categoryId: category.id, cardId: card.id, amount: 300 }))
    const result = await cardService.registerPayment(card.id, { amount: 300, paidAt: '2026-09-10', notes: 'Fatura setembro' })
    assert.equal(result.summary.purchasesTotal, 300)
    assert.equal(result.summary.paidAmount, 300)
    assert.equal(result.summary.usedLimit, 0)
    assert.equal((await transactionService.listTransactions({ page: 1, limit: 20, sortBy: 'date', sortDir: 'asc', cardId: card.id })).data.length, 1)
    await assert.rejects(cardService.registerPayment(card.id, { amount: 1, paidAt: '2026-09-10', notes: '' }), ConflictError)
    await transactionService.deleteTransaction(purchase.id)
    await assert.rejects(cardService.deleteCard(card.id), ConflictError, 'o pagamento persistido também mantém o cartão protegido')
  })
})

describe('22. Atomicidade da criação de parcelas', () => {
  test('erro no meio da geração não deixa nenhuma parcela salva parcialmente', async () => {
    const category = await expenseCategory({ name: 'Categoria atomicidade teste' })
    const db = getDatabase()
    const countBefore = (await db.prepare('SELECT COUNT(*) AS n FROM transactions').get()).n

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

    await assert.rejects(transactionRepository.createMany(rows))

    const countAfter = (await db.prepare('SELECT COUNT(*) AS n FROM transactions').get()).n
    assert.equal(countAfter, countBefore, 'nenhuma linha do lote deve ter sido persistida')

    const leftover = db
      .prepare("SELECT COUNT(*) AS n FROM transactions WHERE installment_group_id = 'atomic-test-group'")
    assert.equal((await leftover.get()).n, 0)
  })
})
