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
  return {
    breakdown: getCategoryBreakdown(transactions, selectedMonth),
    trend: getMonthlyTrend(transactions, 6, selectedMonth),
    summary: getMonthSummary(transactions, selectedMonth),
    topExpenses: getTopExpenses(transactions, selectedMonth, 5),
  }
}
