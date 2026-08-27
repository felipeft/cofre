const { roundCurrency } = require('./financialRules')

/**
 * Limite usado = soma de todas as despesas em aberto (não canceladas)
 * associadas ao cartão — inclui tanto parcelas já competência-passada
 * quanto futuras, porque o limite de crédito reflete o compromisso total
 * assumido, não apenas o que já "venceu". Não há ainda um conceito de
 * fatura paga nesta etapa (deliberadamente fora de escopo — ver README),
 * então "em aberto" aqui significa apenas `status !== 'cancelled'`.
 *
 * @param {{ creditLimit: number, openTransactions: Array<{ amount: number }> }} input
 */
function calculateCardLimitUsage({ creditLimit, openTransactions }) {
  const usedLimit = roundCurrency(openTransactions.reduce((sum, t) => sum + t.amount, 0))
  const availableLimit = roundCurrency(creditLimit - usedLimit)

  return {
    creditLimit: roundCurrency(creditLimit),
    usedLimit,
    availableLimit,
  }
}

module.exports = { calculateCardLimitUsage }
