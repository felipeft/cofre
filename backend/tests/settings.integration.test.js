const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-settings-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')

const USER_A = 1
const USER_B = 2
const settingsA = asUser(require('../src/services/settings.service'), USER_A)
const settingsB = asUser(require('../src/services/settings.service'), USER_B)
const categoriesA = asUser(require('../src/services/category.service'), USER_A)
const categoriesB = asUser(require('../src/services/category.service'), USER_B)
const transactionsA = asUser(require('../src/services/transaction.service'), USER_A)
const transactionsB = asUser(require('../src/services/transaction.service'), USER_B)

before(async () => {
  await ensureDatabaseReady()
  await createTestUser({ id: USER_A })
  await createTestUser({ id: USER_B })
})

after(async () => {
  await closeDatabase()
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true })
})

function incomeCategory(service, name, overrides = {}) {
  return service.createCategory({
    name,
    type: 'income',
    color: '#3ecf8e',
    icon: 'Wallet',
    isActive: true,
    sortOrder: 0,
    applyOffer: true,
    offerRate: null,
    applyTithe: true,
    titheRate: null,
    ...overrides,
  })
}

function income(categoryId, description) {
  return {
    description,
    amount: 1000,
    type: 'income',
    categoryId,
    date: '2035-01-10',
    notes: '',
    source: 'manual',
    isRecurring: false,
    isFixed: false,
    tags: [],
    status: 'confirmed',
  }
}

test('defaults existem para cada usuário e PATCH parcial preserva campos ausentes', async () => {
  assert.deepEqual(
    (({ defaultOfferRate, defaultTitheRate }) => ({ defaultOfferRate, defaultTitheRate }))(await settingsA.getSettings()),
    { defaultOfferRate: 0.01, defaultTitheRate: 0.1 }
  )
  await settingsA.updateSettings({ defaultOfferRate: 0.02 })
  const updatedA = await settingsA.getSettings()
  const untouchedB = await settingsB.getSettings()
  assert.equal(updatedA.defaultOfferRate, 0.02)
  assert.equal(updatedA.defaultTitheRate, 0.1)
  assert.equal(untouchedB.defaultOfferRate, 0.01)
})

test('preferências financeiras são isoladas e snapshots históricos não mudam', async () => {
  await settingsA.updateSettings({ defaultOfferRate: 0.01, defaultTitheRate: 0.1 })
  await settingsB.updateSettings({ defaultOfferRate: 0.03, defaultTitheRate: 0.2 })
  const categoryA = await incomeCategory(categoriesA, 'Renda configurável')
  const categoryB = await incomeCategory(categoriesB, 'Renda configurável')

  const oldA = await transactionsA.createTransaction(income(categoryA.id, 'Antes da mudança'))
  const onlyB = await transactionsB.createTransaction(income(categoryB.id, 'Outro usuário'))
  assert.equal(oldA.offerRateApplied, 0.01)
  assert.equal(oldA.titheRateApplied, 0.1)
  assert.equal(onlyB.offerRateApplied, 0.03)
  assert.equal(onlyB.titheRateApplied, 0.2)

  await settingsA.updateSettings({ defaultOfferRate: 0.02 })
  const newA = await transactionsA.createTransaction(income(categoryA.id, 'Depois da mudança'))
  assert.equal(newA.offerRateApplied, 0.02)
  assert.equal((await transactionsA.getTransactionById(oldA.id)).offerRateApplied, 0.01)
})

test('override da categoria prevalece sobre a preferência do usuário', async () => {
  await settingsA.updateSettings({ defaultOfferRate: 0.02, defaultTitheRate: 0.2 })
  const category = await incomeCategory(categoriesA, 'Renda com override', { offerRate: 0.015, titheRate: 0.08 })
  const transaction = await transactionsA.createTransaction(income(category.id, 'Com override'))
  assert.equal(transaction.offerRateApplied, 0.015)
  assert.equal(transaction.titheRateApplied, 0.08)
  assert.equal(transaction.offerAmount, 15)
  assert.equal(transaction.titheAmount, 80)
})
