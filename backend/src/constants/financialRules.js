// Taxas padrão globais. Uma categoria de receita pode sobrescrever qualquer
// uma delas (ver `offer_rate`/`tithe_rate` em categories) — quando não
// sobrescreve, cai aqui. Nenhum outro arquivo do backend deve ter `0.01` ou
// `0.10` soltos no meio do código; tudo passa por esta constante.
module.exports = Object.freeze({
  DEFAULT_OFFER_RATE: 0.01,
  DEFAULT_TITHE_RATE: 0.1,
})
