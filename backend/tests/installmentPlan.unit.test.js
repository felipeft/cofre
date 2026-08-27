const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { buildInstallmentPlan, resolveFirstInstallmentDate, addMonths } = require('../src/domain/installmentPlan')

describe('domain/installmentPlan — resolveFirstInstallmentDate (ciclo de fatura)', () => {
  test('compra antes/no dia do fechamento entra no ciclo corrente', () => {
    assert.equal(resolveFirstInstallmentDate('2026-08-05', { closingDay: 10, dueDay: 20 }), '2026-08-20')
    assert.equal(resolveFirstInstallmentDate('2026-08-10', { closingDay: 10, dueDay: 20 }), '2026-08-20')
  })

  test('compra depois do fechamento entra no ciclo seguinte', () => {
    assert.equal(resolveFirstInstallmentDate('2026-08-15', { closingDay: 10, dueDay: 20 }), '2026-09-20')
  })

  test('vencimento no mesmo mês do fechamento quando dueDay > closingDay', () => {
    assert.equal(resolveFirstInstallmentDate('2026-08-05', { closingDay: 10, dueDay: 20 }), '2026-08-20')
  })

  test('vencimento rola para o mês seguinte quando dueDay <= closingDay', () => {
    // fecha dia 25, vence dia 5 -> vencimento é sempre no mês seguinte ao fechamento
    assert.equal(resolveFirstInstallmentDate('2026-08-10', { closingDay: 25, dueDay: 5 }), '2026-09-05')
  })

  test('vira o ano corretamente', () => {
    assert.equal(resolveFirstInstallmentDate('2026-12-15', { closingDay: 10, dueDay: 20 }), '2027-01-20')
  })

  test('dia da compra além do último dia do mês de destino não estoura (clamp)', () => {
    // compra 31/01 entra no ciclo seguinte (fev), due day 30 não existe em
    // fevereiro -> cai no último dia do mês
    const date = resolveFirstInstallmentDate('2026-01-31', { closingDay: 5, dueDay: 30 })
    assert.equal(date, '2026-02-28') // 2026 não é bissexto
  })
})

describe('domain/installmentPlan — addMonths', () => {
  test('avança meses simples', () => {
    assert.equal(addMonths('2026-08-20', 1), '2026-09-20')
    assert.equal(addMonths('2026-08-20', 4), '2026-12-20')
  })

  test('vira o ano', () => {
    assert.equal(addMonths('2026-11-15', 3), '2027-02-15')
  })

  test('clampa dia inexistente no mês de destino', () => {
    assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
    assert.equal(addMonths('2026-01-30', 1), '2026-02-28')
  })
})

describe('domain/installmentPlan — buildInstallmentPlan', () => {
  test('cenário do prompt: R$1200 em 12x, compra 20/08/2026, fecha 10 vence 20', () => {
    const plan = buildInstallmentPlan({
      totalAmount: 1200,
      installmentsCount: 12,
      purchaseDate: '2026-08-20',
      description: 'Notebook',
      card: { closingDay: 10, dueDay: 20 },
    })

    assert.equal(plan.length, 12)
    assert.equal(plan[0].date, '2026-09-20') // compra após o fechamento -> ciclo seguinte
    assert.equal(plan[11].date, '2027-08-20')
    plan.forEach((p, i) => {
      assert.equal(p.installmentCurrent, i + 1)
      assert.equal(p.installmentTotal, 12)
      assert.equal(p.amount, 100)
      assert.equal(p.description, 'Notebook')
    })

    const sum = plan.reduce((s, p) => s + p.amount, 0)
    assert.equal(sum, 1200, 'soma das parcelas deve ser exatamente igual ao valor original')
  })

  test('arredondamento: R$100 em 3x nunca perde/ganha centavos', () => {
    const plan = buildInstallmentPlan({
      totalAmount: 100,
      installmentsCount: 3,
      purchaseDate: '2026-01-15',
      description: 'x',
      card: { closingDay: 10, dueDay: 20 },
    })
    const amounts = plan.map((p) => p.amount)
    assert.deepEqual(amounts, [33.33, 33.33, 33.34])
    assert.equal(amounts.reduce((s, a) => s + a, 0), 100)
  })

  test('arredondamento com muitas parcelas (R$1000 em 7x)', () => {
    const plan = buildInstallmentPlan({
      totalAmount: 1000,
      installmentsCount: 7,
      purchaseDate: '2026-01-15',
      description: 'x',
      card: { closingDay: 10, dueDay: 20 },
    })
    const sum = plan.reduce((s, p) => s + p.amount, 0)
    assert.equal(Math.round(sum * 100) / 100, 1000)
  })

  test('competência de cada parcela corresponde à sua própria data de vencimento', () => {
    const plan = buildInstallmentPlan({
      totalAmount: 300,
      installmentsCount: 3,
      purchaseDate: '2026-11-15',
      description: 'x',
      card: { closingDay: 10, dueDay: 20 },
    })
    assert.deepEqual(
      plan.map((p) => `${p.competenceMonth}/${p.competenceYear}`),
      ['12/2026', '1/2027', '2/2027']
    )
  })

  test('compra em 1x (installmentsCount=1) devolve uma única parcela com o valor total', () => {
    const plan = buildInstallmentPlan({
      totalAmount: 250,
      installmentsCount: 1,
      purchaseDate: '2026-08-05',
      description: 'x',
      card: { closingDay: 10, dueDay: 20 },
    })
    assert.equal(plan.length, 1)
    assert.equal(plan[0].amount, 250)
    assert.equal(plan[0].installmentCurrent, 1)
    assert.equal(plan[0].installmentTotal, 1)
  })
})
