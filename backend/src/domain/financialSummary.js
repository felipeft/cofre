const { roundCurrency } = require('../utils/money')

/**
 * Resume um conjunto de transações (tipicamente de um mês).
 * saldo = receitas − despesas
 * @param {Array<{ type: 'income'|'expense', amount: number }>} transactions
 */
function calculateFinancialSummary(transactions) {
  let totalIncome = 0
  let totalExpenses = 0

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount
    } else {
      totalExpenses += t.amount
    }
  }

  totalIncome = roundCurrency(totalIncome)
  totalExpenses = roundCurrency(totalExpenses)
  const balance = roundCurrency(totalIncome - totalExpenses)

  return { totalIncome, totalExpenses, balance }
}

module.exports = { calculateFinancialSummary }
