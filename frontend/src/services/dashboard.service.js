// Sem endpoint dedicado de dashboard na API ainda, então continua calculado
// no cliente a partir de GET /transactions (ver transaction.service.js). Se
// um dia existir um endpoint pronto, troca-se o corpo desta função por uma
// chamada a `apiClient.get(ENDPOINTS.dashboard)` — a página Dashboard não
// muda nada, só consome `useDashboard()` como já consome hoje.
import {
  getMonthSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentTransactions,
} from '@/utils/aggregations'

export function getDashboardOverview(transactions) {
  return {
    summary: getMonthSummary(transactions),
    breakdown: getCategoryBreakdown(transactions),
    trend: getMonthlyTrend(transactions, 6),
    recent: getRecentTransactions(transactions, 6),
  }
}
