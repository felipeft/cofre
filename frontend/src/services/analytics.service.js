// Mesma lógica do dashboard.service: sem endpoint dedicado de analytics na
// API ainda, calcula no cliente a partir de GET /transactions. Endpoint
// dedicado no futuro = trocar só o corpo desta função.
import {
  getCategoryBreakdown,
  getMonthlyTrend,
  getMonthSummary,
  getTopExpenses,
} from '@/utils/aggregations'

export function getAnalyticsOverview(transactions, selectedMonth) {
  const summary = getMonthSummary(transactions, selectedMonth)
  const asIncomePercentage = (value) => summary.income > 0 ? (value / summary.income) * 100 : null

  return {
    breakdown: getCategoryBreakdown(transactions, selectedMonth).map((item) => ({
      ...item,
      incomePercentage: asIncomePercentage(item.value),
    })),
    trend: getMonthlyTrend(transactions, 6, selectedMonth),
    summary,
    topExpenses: getTopExpenses(transactions, selectedMonth, 5).map((item) => ({
      ...item,
      incomePercentage: asIncomePercentage(item.amount),
    })),
  }
}
