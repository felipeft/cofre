const { roundCurrency } = require('../utils/money')
const { deriveCompetenceFromDate } = require('../utils/competence')

// Avança uma data (YYYY-MM-DD) em N meses, preservando o dia quando possível
// e "grudando" no último dia do mês de destino quando ele não existe lá (ex:
// dia 31 + 1 mês num mês de 30 dias vira dia 30) — evita que a data estoure
// para o mês seguinte silenciosamente.
function addMonths(dateStr, months) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const targetMonthIndex = month - 1 + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const targetDay = Math.min(day, lastDayOfTargetMonth)

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function buildDateForDay(year, month0, day) {
  const lastDayOfMonth = new Date(year, month0 + 1, 0).getDate()
  const safeDay = Math.min(day, lastDayOfMonth)
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

/**
 * Determina a data de vencimento da PRIMEIRA parcela, a partir do dia da
 * compra e do ciclo de fatura do cartão (closingDay/dueDay).
 *
 * Regra adotada (documentada aqui por ser uma decisão de negócio que o
 * enunciado deixou em aberto — ver README para o raciocínio completo):
 *
 * 1. Se a compra foi feita NO dia do fechamento ou antes, ela entra no
 *    ciclo que fecha NESTE mês. Depois do fechamento, entra no ciclo que
 *    fecha no mês SEGUINTE.
 * 2. Dentro de um ciclo, o vencimento é o `dueDay`. Se `dueDay` for maior
 *    que `closingDay` (o caso comum — ex: fecha dia 10, vence dia 20), o
 *    vencimento cai no MESMO mês do fechamento. Se `dueDay` for menor ou
 *    igual a `closingDay` (ex: fecha dia 25, vence dia 5), o vencimento cai
 *    no mês SEGUINTE ao fechamento.
 *
 * `date` (e, por consequência, `competence`) de cada parcela é o vencimento
 * daquela parcela — é quando aquele compromisso financeiro específico
 * acontece, não a data da compra original repetida N vezes.
 */
function resolveFirstInstallmentDate(purchaseDateStr, { closingDay, dueDay }) {
  const [year, month, day] = purchaseDateStr.split('-').map(Number)
  const month0 = month - 1

  const entersNextCycle = day > closingDay
  const closingMonth0 = month0 + (entersNextCycle ? 1 : 0)

  const dueRollsToNextMonth = dueDay <= closingDay
  const dueMonth0 = closingMonth0 + (dueRollsToNextMonth ? 1 : 0)

  const dueYear = year + Math.floor(dueMonth0 / 12)
  const normalizedDueMonth0 = ((dueMonth0 % 12) + 12) % 12

  return buildDateForDay(dueYear, normalizedDueMonth0, dueDay)
}

/**
 * Divide uma compra parcelada em N transações individuais, uma por parcela.
 * Função pura: recebe os dados da compra, devolve um array de "rascunhos"
 * de transação prontos para o repository persistir — não sabe nada de SQL.
 *
 * O valor é dividido em partes iguais arredondadas a 2 casas; a diferença de
 * arredondamento é absorvida pela ÚLTIMA parcela, garantindo que a soma das
 * parcelas seja sempre exatamente igual ao valor total da compra.
 *
 * @param {{
 *   totalAmount: number,
 *   installmentsCount: number,
 *   purchaseDate: string,
 *   description: string,
 *   card: { closingDay: number, dueDay: number },
 * }} purchase
 */
function buildInstallmentPlan({ totalAmount, installmentsCount, purchaseDate, description, card }) {
  const baseInstallmentAmount = roundCurrency(totalAmount / installmentsCount)
  const roundingRemainder = roundCurrency(totalAmount - baseInstallmentAmount * installmentsCount)
  const firstDueDate = resolveFirstInstallmentDate(purchaseDate, card)

  return Array.from({ length: installmentsCount }, (_, index) => {
    const installmentCurrent = index + 1
    const isLast = installmentCurrent === installmentsCount
    const date = addMonths(firstDueDate, index)
    const { competenceMonth, competenceYear } = deriveCompetenceFromDate(date)

    return {
      description,
      amount: isLast ? roundCurrency(baseInstallmentAmount + roundingRemainder) : baseInstallmentAmount,
      date,
      competenceMonth,
      competenceYear,
      installmentCurrent,
      installmentTotal: installmentsCount,
    }
  })
}

module.exports = { buildInstallmentPlan, resolveFirstInstallmentDate, addMonths }
