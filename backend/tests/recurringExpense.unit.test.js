const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { buildOccurrenceDate, buildOccurrencesThrough } = require('../src/domain/recurringExpense')

function recurring(overrides = {}) {
  return { id: 1, description: 'Internet', amount: 100, categoryId: 1, dayOfMonth: 10, startDate: '2026-08-01', endDate: null, isActive: true, ...overrides }
}

describe('domain/recurringExpense', () => {
  test('gera o dia mensal configurado e atravessa ano', () => {
    assert.deepEqual(buildOccurrencesThrough(recurring({ startDate: '2026-11-01' }), '2027-01-20').map((item) => item.date), ['2026-11-10', '2026-12-10', '2027-01-10'])
  })
  test('não gera data antes do início no mesmo mês', () => {
    assert.deepEqual(buildOccurrencesThrough(recurring({ startDate: '2026-08-15', dayOfMonth: 10 }), '2026-09-30').map((item) => item.date), ['2026-09-10'])
  })
  test('clampa dias 29, 30 e 31 no último dia de fevereiro, inclusive bissexto', () => {
    assert.equal(buildOccurrenceDate(2026, 2, 29), '2026-02-28')
    assert.equal(buildOccurrenceDate(2024, 2, 29), '2024-02-29')
    assert.equal(buildOccurrenceDate(2026, 2, 30), '2026-02-28')
    assert.equal(buildOccurrenceDate(2026, 2, 31), '2026-02-28')
  })
  test('respeita data final mesmo quando ela é anterior ao dia do mês', () => {
    assert.deepEqual(buildOccurrencesThrough(recurring({ dayOfMonth: 10, startDate: '2026-08-01', endDate: '2026-10-05' }), '2026-12-01').map((item) => item.date), ['2026-08-10', '2026-09-10'])
  })
  test('não gera recorrência inativa', () => assert.deepEqual(buildOccurrencesThrough(recurring({ isActive: false }), '2026-10-01'), []))
})
