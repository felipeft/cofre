const { deriveCompetenceFromDate } = require('../utils/competence')

function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate()
}

function buildOccurrenceDate(year, month, dayOfMonth) {
  const day = Math.min(dayOfMonth, daysInMonth(year, month - 1))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthStart(date) {
  const [year, month] = date.split('-').map(Number)
  return { year, month }
}

function advanceMonth({ year, month }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function nextMonthStart(date) {
  const next = advanceMonth(monthStart(date))
  return `${next.year}-${String(next.month).padStart(2, '0')}-01`
}

// Retorna os rascunhos de ocorrências entre start_date e o mês de referência.
// O dia é "clampado" ao último dia do mês para não ocorrer rollover (31/02).
function buildOccurrencesThrough(recurringExpense, asOfDate) {
  if (!recurringExpense.isActive) return []

  const asOf = monthStart(asOfDate)
  const end = recurringExpense.endDate ? monthStart(recurringExpense.endDate) : null
  const occurrences = []
  let cursor = monthStart(recurringExpense.startDate)

  while (cursor.year < asOf.year || (cursor.year === asOf.year && cursor.month <= asOf.month)) {
    if (end && (cursor.year > end.year || (cursor.year === end.year && cursor.month > end.month))) break

    const date = buildOccurrenceDate(cursor.year, cursor.month, recurringExpense.dayOfMonth)
    if (date >= recurringExpense.startDate && (!recurringExpense.endDate || date <= recurringExpense.endDate)) {
      const competence = deriveCompetenceFromDate(date)
      occurrences.push({ date, ...competence })
    }
    cursor = advanceMonth(cursor)
  }

  return occurrences
}

module.exports = { daysInMonth, buildOccurrenceDate, buildOccurrencesThrough, nextMonthStart }
