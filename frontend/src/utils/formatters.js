export function formatCurrency(value) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCompactCurrency(value) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1000) {
    return `${sign}R$ ${(abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return formatCurrency(value)
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateInput(date = new Date()) {
  return date.toISOString().split('T')[0]
}

export function relativeDayLabel(dateStr) {
  const today = formatDateInput(new Date())
  const yesterday = formatDateInput(new Date(Date.now() - 86400000))
  if (dateStr === today) return 'Hoje'
  if (dateStr === yesterday) return 'Ontem'
  return formatDateFull(dateStr)
}

export function monthLabel(monthIndex) {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return labels[monthIndex]
}
