// Mesma lógica do dashboard.service: hoje calcula no cliente, no futuro
// pode virar uma chamada a GET /analytics.
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
