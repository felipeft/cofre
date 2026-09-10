const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { calculateCardLimitUsage } = require('../src/domain/cardLimit')

describe('domain/cardLimit — calculateCardLimitUsage', () => {
  test('soma as transações em aberto e subtrai do limite total', () => {
    const usage = calculateCardLimitUsage({
      creditLimit: 5000,
      openTransactions: [{ amount: 100 }, { amount: 100 }, { amount: 1000 }],
    })
    assert.equal(usage.creditLimit, 5000)
    assert.equal(usage.usedLimit, 1200)
    assert.equal(usage.availableLimit, 3800)
  })

  test('sem transações -> limite usado zero, disponível igual ao total', () => {
    const usage = calculateCardLimitUsage({ creditLimit: 5000, openTransactions: [] })
    assert.equal(usage.usedLimit, 0)
    assert.equal(usage.availableLimit, 5000)
  })

  test('pagamento da fatura reduz o limite sem transformar a compra em nova despesa', () => {
    const usage = calculateCardLimitUsage({ creditLimit: 1000, openTransactions: [{ amount: 500 }], payments: [{ amount: 500 }] })
    assert.equal(usage.purchasesTotal, 500)
    assert.equal(usage.paidAmount, 500)
    assert.equal(usage.usedLimit, 0)
    assert.equal(usage.availableLimit, 1000)
  })

  test('pode ultrapassar o limite (não trava/lança) — disponível fica negativo', () => {
    const usage = calculateCardLimitUsage({ creditLimit: 1000, openTransactions: [{ amount: 1500 }] })
    assert.equal(usage.availableLimit, -500)
  })
})
