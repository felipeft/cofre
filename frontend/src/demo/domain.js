export function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function addMonths(dateString, months) {
  const [year, month, day] = dateString.split('-').map(Number)
  const targetIndex = month - 1 + months
  const targetYear = year + Math.floor(targetIndex / 12)
  const targetMonth = ((targetIndex % 12) + 12) % 12
  const targetDay = Math.min(day, new Date(targetYear, targetMonth + 1, 0).getDate())
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

function dateForDay(year, monthIndex, day) {
  const normalized = new Date(year, monthIndex, 1)
  const safeDay = Math.min(day, new Date(normalized.getFullYear(), normalized.getMonth() + 1, 0).getDate())
  return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

export function resolveFirstInstallmentDate(purchaseDate, card) {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  const closingMonth = month - 1 + (day > card.closingDay ? 1 : 0)
  const dueMonth = closingMonth + (card.dueDay <= card.closingDay ? 1 : 0)
  return dateForDay(year, dueMonth, card.dueDay)
}

export function buildInstallmentPlan({ totalAmount, installmentsCount, purchaseDate, description, card }) {
  const baseAmount = roundCurrency(totalAmount / installmentsCount)
  const remainder = roundCurrency(totalAmount - baseAmount * installmentsCount)
  const firstDate = resolveFirstInstallmentDate(purchaseDate, card)

  return Array.from({ length: installmentsCount }, (_, index) => ({
    description,
    amount: index === installmentsCount - 1 ? roundCurrency(baseAmount + remainder) : baseAmount,
    date: addMonths(firstDate, index),
    installmentCurrent: index + 1,
    installmentTotal: installmentsCount,
  }))
}

export function occurrenceDate(year, month, dayOfMonth) {
  return dateForDay(year, month - 1, dayOfMonth)
}

export function monthStart(dateString) {
  return `${dateString.slice(0, 7)}-01`
}
