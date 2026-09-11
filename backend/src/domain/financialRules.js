const { DEFAULT_OFFER_RATE, DEFAULT_TITHE_RATE } = require('../constants/financialRules')

// Arredondamento monetário consistente com o resto do backend: valores em
// reais como número de ponto flutuante (mesma estratégia já usada por
// `amount` em transactions), arredondados para 2 casas em toda fronteira de
// cálculo para não acumular erro de ponto flutuante entre somas.
function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// Uma taxa `null`/`undefined` na categoria significa "use o padrão global".
// Uma taxa `0` é uma escolha explícita (categoria elegível, mas com taxa
// zerada) e não deve cair no padrão — por isso `??`, não `||`.
function resolveRate(categoryRate, defaultRate) {
  return categoryRate ?? defaultRate
}

/**
 * Calcula oferta e dízimo de uma transação de receita a partir das regras
 * configuradas na sua categoria (a "fonte de renda"). Função pura: não lê
 * nem escreve banco, não conhece HTTP — só números entram, números saem.
 * Isso é o que a torna testável isoladamente e reaproveitável (hoje usada
 * na criação/edição de transação; futuramente pode alimentar relatórios,
 * projeções, etc. sem duplicar a regra).
 *
 * Nenhum nome de categoria/fonte é lido aqui — só as propriedades
 * `type`/`applyOffer`/`offerRate`/`applyTithe`/`titheRate`. A regra não faz
 * ideia se a fonte se chama "Pai", "Emprego" ou algo que ainda não existe.
 *
 * Precedência das taxas: override da categoria → preferência do usuário →
 * default do sistema. O service carrega as preferências; o domínio recebe
 * apenas números e continua puro.
 *
 * @param {{ amount: number, category: { type: string, applyOffer: boolean, offerRate: number|null, applyTithe: boolean, titheRate: number|null }, defaults?: { offerRate?: number, titheRate?: number } }} input
 */
function calculateIncomeObligations({ amount, category, defaults = {} }) {
  // Só receita gera oferta/dízimo. Uma despesa (ou uma transação sem
  // categoria resolvida) nunca gera obrigação — devolve zeros explícitos em
  // vez de deixar `undefined` se propagar.
  if (!category || category.type !== 'income' || !Number.isFinite(amount) || amount <= 0) {
    return { offerAmount: 0, titheAmount: 0, offerRateApplied: null, titheRateApplied: null }
  }

  const userOfferRate = defaults.offerRate ?? DEFAULT_OFFER_RATE
  const userTitheRate = defaults.titheRate ?? DEFAULT_TITHE_RATE
  const offerRateApplied = category.applyOffer ? resolveRate(category.offerRate, userOfferRate) : null
  const titheRateApplied = category.applyTithe ? resolveRate(category.titheRate, userTitheRate) : null

  return {
    offerAmount: offerRateApplied != null ? roundCurrency(amount * offerRateApplied) : 0,
    titheAmount: titheRateApplied != null ? roundCurrency(amount * titheRateApplied) : 0,
    offerRateApplied,
    titheRateApplied,
  }
}

module.exports = { calculateIncomeObligations, roundCurrency, resolveRate }
