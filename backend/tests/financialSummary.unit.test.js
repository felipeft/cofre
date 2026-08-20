const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { calculateFinancialSummary } = require('../src/domain/financialSummary')

describe('domain/financialSummary — calculateFinancialSummary', () => {
  test('soma receitas, despesas e obrigações sem contar oferta/dízimo como despesa', () => {
    const summary = calculateFinancialSummary([
      { type: 'income', amount: 2000, offerAmount: 20, titheAmount: 0 },
      { type: 'income', amount: 5000, offerAmount: 50, titheAmount: 500 },
      { type: 'expense', amount: 300, offerAmount: 0, titheAmount: 0 },
    ])

    assert.equal(summary.totalIncome, 7000)
    assert.equal(summary.totalExpenses, 300)
    assert.equal(summary.offerAmount, 70)
    assert.equal(summary.titheAmount, 500)
    assert.equal(summary.offerAndTitheTotal, 570)
    // 7000 - 300 - 570, nunca 7000 - (300 + 570 contado de novo dentro de totalExpenses)
    assert.equal(summary.balance, 6130)
  })

  test('lista vazia -> tudo zero, sem lançar', () => {
    const summary = calculateFinancialSummary([])
    assert.deepEqual(summary, {
      totalIncome: 0,
      totalExpenses: 0,
      offerAmount: 0,
      titheAmount: 0,
      offerAndTitheTotal: 0,
      balance: 0,
    })
  })

  test('só despesas -> saldo negativo, sem oferta/dízimo', () => {
    const summary = calculateFinancialSummary([
      { type: 'expense', amount: 100, offerAmount: 0, titheAmount: 0 },
      { type: 'expense', amount: 50, offerAmount: 0, titheAmount: 0 },
    ])
    assert.equal(summary.totalIncome, 0)
    assert.equal(summary.totalExpenses, 150)
    assert.equal(summary.balance, -150)
  })
})
