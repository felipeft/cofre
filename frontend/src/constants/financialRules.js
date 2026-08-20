// Espelha os padrões definidos no backend
// (backend/src/constants/financialRules.js) — usado exclusivamente para
// calcular a PRÉVIA informativa de oferta/dízimo no formulário de
// lançamento, antes de salvar. O valor realmente persistido sempre vem da
// API (Transaction.offerAmount/titheAmount, calculados pelo backend); este
// espelho nunca é enviado como dado nem tratado como fonte de verdade.
export const DEFAULT_OFFER_RATE = 0.01
export const DEFAULT_TITHE_RATE = 0.1
