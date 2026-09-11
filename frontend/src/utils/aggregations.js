import { chartMonthLabel, monthKey as monthKeyFromDate, shiftMonthKey } from './months'

// Funções puras de cálculo — não sabem de onde vêm os dados nem resolvem
// categoria (isso é responsabilidade dos Services/Hooks). Assim continuam
// testáveis isoladamente e reutilizáveis em qualquer contexto.

export function currentMonthKey(date = new Date()) {
  return monthKeyFromDate(date)
}

function monthKeyOf(transaction) {
  if (transaction.competence?.year && transaction.competence?.month) {
    return `${transaction.competence.year}-${String(transaction.competence.month).padStart(2, '0')}`
  }
  return transaction.date.slice(0, 7)
}

export function getMonthSummary(transactions, monthKey = currentMonthKey()) {
  const items = transactions.filter((t) => monthKeyOf(t) === monthKey && t.status !== 'cancelled')
  const income = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, balance: income - expense, count: items.length }
}

export function getCategoryBreakdown(transactions, monthKey = currentMonthKey(), type = 'expense') {
  const items = transactions.filter((t) => monthKeyOf(t) === monthKey && t.type === type && t.status !== 'cancelled')
  const totals = new Map()
  for (const t of items) {
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
  }
  return [...totals.entries()]
    .map(([categoryId, value]) => ({ categoryId, value }))
    .sort((a, b) => b.value - a.value)
}

export function getMonthlyTrend(transactions, monthsBack = 6, endMonthKey = currentMonthKey()) {
  const result = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const key = shiftMonthKey(endMonthKey, -i)
    const summary = getMonthSummary(transactions, key)
    result.push({
      key,
      label: chartMonthLabel(key),
      receitas: Math.round(summary.income),
      despesas: Math.round(summary.expense),
      saldo: Math.round(summary.balance),
    })
  }
  return result
}

export function getTopExpenses(transactions, monthKey = currentMonthKey(), limit = 5) {
  return transactions
    .filter((t) => monthKeyOf(t) === monthKey && t.type === 'expense' && t.status !== 'cancelled')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function getRecentTransactions(transactions, limit = 6, selectedMonth = currentMonthKey()) {
  return transactions
    .filter((transaction) => monthKeyOf(transaction) === selectedMonth && transaction.status !== 'cancelled')
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, limit)
}
