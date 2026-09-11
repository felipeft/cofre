// Teto de parcelas aceito numa compra parcelada. Não é uma regra de negócio
// Este é apenas um limite operacional sensato
// para evitar, por exemplo, uma compra "9999x" gerando milhares de linhas
// por engano. 60 parcelas (5 anos) já é bem acima do que qualquer cartão de
// crédito comum oferece.
module.exports = Object.freeze({
  MAX_INSTALLMENTS: 60,
})
