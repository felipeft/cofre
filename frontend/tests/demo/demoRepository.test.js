import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoApiClient, DemoApiError } from '../../src/demo/repository.js'
import { DEMO_STORAGE_KEY } from '../../src/demo/storage.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    dump: () => Object.fromEntries(values),
  }
}

test('entra automaticamente com uma identidade fictícia e cria um seed rico', async () => {
  const api = createDemoApiClient(memoryStorage())
  const session = await api.get('/auth/me')
  const categories = await api.get('/categories?includeInactive=true')
  const cards = await api.get('/cards?includeInactive=true')
  const recurring = await api.get('/recurring-expenses?includeInactive=true')

  assert.equal(session.data.authenticated, true)
  assert.equal(session.data.user.email, 'demo@cofre.local')
  assert.ok(categories.data.length >= 8)
  assert.ok(cards.data.length >= 2)
  assert.ok(recurring.data.length >= 3)
})

test('CRUD persiste apenas no storage fornecido', async () => {
  const storage = memoryStorage()
  const firstClient = createDemoApiClient(storage)
  const created = await firstClient.post('/categories', { name: 'Pets', type: 'expense', color: '#123456', icon: 'Dog' })
  const secondClient = createDemoApiClient(storage)
  const categories = await secondClient.get('/categories?includeInactive=true')

  assert.ok(categories.data.some((item) => item.id === created.data.id && item.name === 'Pets'))
  assert.deepEqual(Object.keys(storage.dump()), [DEMO_STORAGE_KEY])
})

test('parcelamento conserva o total e cria parcelas em competências sucessivas', async () => {
  const api = createDemoApiClient(memoryStorage())
  const result = await api.post('/transactions', {
    description: 'Compra parcelada', amount: 100, type: 'expense', categoryId: 7,
    date: '2026-09-12', cardId: 1, installmentTotal: 3,
  })

  assert.equal(result.data.count, 3)
  assert.equal(result.data.transactions.reduce((sum, item) => sum + item.amount, 0), 100)
  assert.deepEqual(result.data.transactions.map((item) => item.date), ['2026-10-18', '2026-11-18', '2026-12-18'])
})

test('geração de recorrências é idempotente inclusive ao consultar o futuro', async () => {
  const api = createDemoApiClient(memoryStorage())
  const first = await api.get('/transactions?month=12&year=2027&page=1&limit=100')
  const second = await api.get('/transactions?month=12&year=2027&page=1&limit=100')
  const firstIds = first.data.filter((item) => item.recurringExpenseId).map((item) => item.id)
  const secondIds = second.data.filter((item) => item.recurringExpenseId).map((item) => item.id)

  assert.ok(firstIds.length >= 3)
  assert.deepEqual(secondIds, firstIds)
  assert.equal(second.meta.total, first.meta.total)
})

test('excluir compra e registrar pagamento atualizam o limite do cartão', async () => {
  const api = createDemoApiClient(memoryStorage())
  const created = await api.post('/transactions', {
    description: 'Despesa no cartão', amount: 75, type: 'expense', categoryId: 5,
    date: '2026-09-12', cardId: 1,
  })
  const withPurchase = await api.get('/cards/1/summary')
  await api.delete(`/transactions/${created.data.id}`)
  const afterDelete = await api.get('/cards/1/summary')
  assert.equal(withPurchase.data.usedLimit - afterDelete.data.usedLimit, 75)

  await api.post('/cards/1/payments', { amount: 50, paidAt: '2026-09-18', notes: '' })
  const afterPayment = await api.get('/cards/1/summary')
  assert.equal(afterDelete.data.usedLimit - afterPayment.data.usedLimit, 50)
})

test('reset restaura o seed e preserva chaves de outras aplicações', async () => {
  const storage = memoryStorage({ 'outra-aplicacao': 'não apagar' })
  const api = createDemoApiClient(storage)
  const created = await api.post('/categories', { name: 'Temporária', type: 'expense', color: '#654321', icon: 'Tag' })
  await api.post('/demo/reset')
  const categories = await api.get('/categories?includeInactive=true')

  assert.ok(!categories.data.some((item) => item.id === created.data.id && item.name === 'Temporária'))
  assert.equal(storage.dump()['outra-aplicacao'], 'não apagar')
})

test('integrações e navegação externas são bloqueadas pelo adaptador', async () => {
  const api = createDemoApiClient(memoryStorage())
  assert.throws(() => api.url('/auth/google'), DemoApiError)
  await assert.rejects(
    api.post('/integrations/google-sheets/sync', { requestId: 'demo' }),
    (error) => error.code === 'DEMO_EXTERNAL_INTEGRATION_DISABLED' && error.status === 403,
  )
})
