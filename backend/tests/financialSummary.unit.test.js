const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { calculateFinancialSummary } = require('../src/domain/financialSummary')

describe('domain/financialSummary — calculateFinancialSummary', () => {
  test('soma receitas, despesas e calcula o saldo', () => {
    assert.deepEqual(calculateFinancialSummary([
      { type: 'income', amount: 2000 }, { type: 'income', amount: 5000 }, { type: 'expense', amount: 300 },
    ]), { totalIncome: 7000, totalExpenses: 300, balance: 6700 })
  })

  test('lista vazia retorna totais zerados', () => {
    assert.deepEqual(calculateFinancialSummary([]), { totalIncome: 0, totalExpenses: 0, balance: 0 })
  })

  test('somente despesas produz saldo negativo', () => {
    assert.deepEqual(calculateFinancialSummary([
      { type: 'expense', amount: 100 }, { type: 'expense', amount: 50 },
    ]), { totalIncome: 0, totalExpenses: 150, balance: -150 })
  })
})
