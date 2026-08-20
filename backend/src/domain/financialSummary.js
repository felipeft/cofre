const { roundCurrency } = require('./financialRules')

/**
 * Resume um conjunto de transações (tipicamente de um mês) em totais claros.
 * Deliberadamente explícito sobre uma pergunta que a etapa anterior deixava
 * implícita: `totalExpenses` NUNCA inclui oferta/dízimo — essas obrigações
 * são um recorte da receita (armazenadas em `offer_amount`/`tithe_amount`
 * na própria transação de receita que as gerou), não uma despesa própria.
 * Sem essa separação explícita, somar despesas + obrigações contaria a
 * mesma saída de dinheiro sob dois nomes diferentes.
 *
 * saldo = receitas − despesas − (oferta + dízimo)
 *
 * @param {Array<{ type: 'income'|'expense', amount: number, offerAmount?: number, titheAmount?: number }>} transactions
 */
function calculateFinancialSummary(transactions) {
  let totalIncome = 0
  let totalExpenses = 0
  let offerAmount = 0
  let titheAmount = 0

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount
      offerAmount += t.offerAmount ?? 0
      titheAmount += t.titheAmount ?? 0
    } else {
      totalExpenses += t.amount
    }
  }

  totalIncome = roundCurrency(totalIncome)
  totalExpenses = roundCurrency(totalExpenses)
  offerAmount = roundCurrency(offerAmount)
  titheAmount = roundCurrency(titheAmount)
  const offerAndTitheTotal = roundCurrency(offerAmount + titheAmount)
  const balance = roundCurrency(totalIncome - totalExpenses - offerAndTitheTotal)

  return { totalIncome, totalExpenses, offerAmount, titheAmount, offerAndTitheTotal, balance }
}

module.exports = { calculateFinancialSummary }
