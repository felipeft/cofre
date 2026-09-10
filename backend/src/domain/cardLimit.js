const { roundCurrency } = require('./financialRules')

/**
 * Limite usado = soma de todas as despesas em aberto (não canceladas)
 * associadas ao cartão — inclui tanto parcelas já competência-passada
 * quanto futuras, porque o limite de crédito reflete o compromisso total
 * assumido, não apenas o que já "venceu". Não há ainda um conceito de
 * fatura paga nesta etapa (deliberadamente fora de escopo — ver README),
 * então "em aberto" aqui significa apenas `status !== 'cancelled'`.
 *
 * Pagamentos de fatura liquidam o compromisso de crédito, sem criar uma
 * segunda despesa financeira: a compra original já é a despesa do Cofre.
 * @param {{ creditLimit: number, openTransactions: Array<{ amount: number }>, payments?: Array<{ amount: number }> }} input
 */
function calculateCardLimitUsage({ creditLimit, openTransactions, payments = [] }) {
  const purchasesTotal = roundCurrency(openTransactions.reduce((sum, t) => sum + t.amount, 0))
  const paidAmount = roundCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0))
  const usedLimit = Math.max(0, roundCurrency(purchasesTotal - paidAmount))
  const availableLimit = roundCurrency(creditLimit - usedLimit)

  return {
    creditLimit: roundCurrency(creditLimit),
    purchasesTotal,
    paidAmount,
    usedLimit,
    availableLimit,
  }
}

module.exports = { calculateCardLimitUsage }
