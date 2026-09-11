const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { calculateIncomeObligations } = require('../src/domain/financialRules')

function incomeCategory(overrides = {}) {
  return { type: 'income', applyOffer: false, offerRate: null, applyTithe: false, titheRate: null, ...overrides }
}

describe('domain/financialRules — calculateIncomeObligations', () => {
  test('Caso 1: Pai (oferta=true, dízimo=false), R$2000 -> oferta R$20, dízimo R$0', () => {
    const result = calculateIncomeObligations({
      amount: 2000,
      category: incomeCategory({ applyOffer: true, applyTithe: false }),
    })
    assert.equal(result.offerAmount, 20)
    assert.equal(result.titheAmount, 0)
  })

  test('Caso 2: Emprego (oferta=true, dízimo=true), R$10000 -> oferta R$100, dízimo R$1000', () => {
    const result = calculateIncomeObligations({
      amount: 10000,
      category: incomeCategory({ applyOffer: true, applyTithe: true }),
    })
    assert.equal(result.offerAmount, 100)
    assert.equal(result.titheAmount, 1000)
  })

  test('Caso 3: fonte sem oferta (applyOffer=false) -> oferta R$0, mesmo com dízimo ativo', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      category: incomeCategory({ applyOffer: false, applyTithe: true }),
    })
    assert.equal(result.offerAmount, 0)
    assert.equal(result.titheAmount, 100)
  })

  test('Caso 4: fonte sem dízimo (applyTithe=false) -> dízimo R$0, mesmo com oferta ativa', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      category: incomeCategory({ applyOffer: true, applyTithe: false }),
    })
    assert.equal(result.offerAmount, 10)
    assert.equal(result.titheAmount, 0)
  })

  test('Caso 5: valor zero não gera obrigação nem valor negativo', () => {
    const result = calculateIncomeObligations({
      amount: 0,
      category: incomeCategory({ applyOffer: true, applyTithe: true }),
    })
    assert.equal(result.offerAmount, 0)
    assert.equal(result.titheAmount, 0)
    assert.ok(result.offerAmount >= 0)
    assert.ok(result.titheAmount >= 0)
  })

  test('despesa nunca gera oferta/dízimo, mesmo com flags true por engano', () => {
    const result = calculateIncomeObligations({
      amount: 500,
      category: { type: 'expense', applyOffer: true, offerRate: null, applyTithe: true, titheRate: null },
    })
    assert.equal(result.offerAmount, 0)
    assert.equal(result.titheAmount, 0)
  })

  test('sem categoria resolvida -> zeros, nunca lança', () => {
    const result = calculateIncomeObligations({ amount: 500, category: null })
    assert.equal(result.offerAmount, 0)
    assert.equal(result.titheAmount, 0)
  })

  test('taxa customizada da categoria sobrescreve o padrão global', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      category: incomeCategory({ applyOffer: true, offerRate: 0.05, applyTithe: true, titheRate: 0.2 }),
    })
    assert.equal(result.offerAmount, 50)
    assert.equal(result.titheAmount, 200)
    assert.equal(result.offerRateApplied, 0.05)
    assert.equal(result.titheRateApplied, 0.2)
  })

  test('taxa customizada igual a zero é respeitada (não cai para o padrão global)', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      category: incomeCategory({ applyOffer: true, offerRate: 0 }),
    })
    assert.equal(result.offerAmount, 0)
    assert.equal(result.offerRateApplied, 0)
  })

  test('sem sobrescrita -> usa o padrão global (1% oferta, 10% dízimo)', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      category: incomeCategory({ applyOffer: true, applyTithe: true }),
    })
    assert.equal(result.offerRateApplied, 0.01)
    assert.equal(result.titheRateApplied, 0.1)
  })

  test('override da categoria prevalece sobre defaults recebidos do usuário', () => {
    const result = calculateIncomeObligations({
      amount: 1000,
      defaults: { offerRate: 0.02, titheRate: 0.2 },
      category: incomeCategory({ applyOffer: true, offerRate: 0.015, applyTithe: true, titheRate: null }),
    })
    assert.equal(result.offerRateApplied, 0.015)
    assert.equal(result.titheRateApplied, 0.2)
  })

  test('arredondamento monetário a 2 casas', () => {
    const result = calculateIncomeObligations({
      amount: 33.33,
      category: incomeCategory({ applyOffer: true, applyTithe: true }),
    })
    assert.equal(result.offerAmount, 0.33)
    assert.equal(result.titheAmount, 3.33)
  })
})
