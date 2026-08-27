// Teto de parcelas aceito numa compra parcelada. Não é uma regra de negócio
// "financeira" (como as taxas de oferta/dízimo) — é só um limite sensato
// para evitar, por exemplo, uma compra "9999x" gerando milhares de linhas
// por engano. 60 parcelas (5 anos) já é bem acima do que qualquer cartão de
// crédito comum oferece.
module.exports = Object.freeze({
  MAX_INSTALLMENTS: 60,
})
