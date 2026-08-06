// A competência (mês/ano) por padrão é a mesma da data do lançamento. Só
// diverge quando o cliente explicitamente informa o contrário (ex: fatura de
// cartão fechada em outro mês) — ver transaction.schema.js.
function deriveCompetenceFromDate(dateStr) {
  const [year, month] = dateStr.split('-').map(Number)
  return { competenceMonth: month, competenceYear: year }
}

module.exports = { deriveCompetenceFromDate }
