const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(value) {
  const [year, month] = value.split('-').map(Number)
  return { year, month, date: new Date(year, month - 1, 1) }
}

export function shiftMonthKey(value, amount) {
  const { year, month } = parseMonthKey(value)
  return monthKey(new Date(year, month - 1 + amount, 1))
}

export function monthLongLabel(value) {
  return parseMonthKey(value).date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function monthCompactLabel(value) {
  const { year, month } = parseMonthKey(value)
  return `${MONTHS_SHORT[month - 1]} ${year}`
}

export function chartMonthLabel(value, systemYear = new Date().getFullYear()) {
  const { year, month } = parseMonthKey(value)
  return year === systemYear ? MONTHS_SHORT[month - 1] : `${MONTHS_SHORT[month - 1]}/${String(year).slice(-2)}`
}

export function monthDateRange(endMonthKey, months = 1) {
  const startMonthKey = shiftMonthKey(endMonthKey, -(months - 1))
  const start = parseMonthKey(startMonthKey)
  const end = parseMonthKey(endMonthKey)
  const lastDay = new Date(end.year, end.month, 0).getDate()
  return {
    dateFrom: `${start.year}-${String(start.month).padStart(2, '0')}-01`,
    dateTo: `${end.year}-${String(end.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}
