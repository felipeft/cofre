// Mesma lógica do dashboard.service: sem endpoint dedicado de analytics na
// API ainda, calcula no cliente a partir de GET /transactions. Endpoint
// dedicado no futuro = trocar só o corpo desta função.
import {
  getCategoryBreakdown,
  getMonthlyTrend,
  getMonthSummary,
  getTopExpenses,
} from '@/utils/aggregations'

export function getAnalyticsOverview(transactions) {
  return {
    breakdown: getCategoryBreakdown(transactions),
    trend: getMonthlyTrend(transactions, 6),
    summary: getMonthSummary(transactions),
    topExpenses: getTopExpenses(transactions, undefined, 5),
  }
}
