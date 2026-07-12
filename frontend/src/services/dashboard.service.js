// Hoje calcula tudo no cliente a partir das transações já carregadas.
// Quando o backend existir, o endpoint GET /dashboard provavelmente devolve
// esse resumo pronto — nesse dia, trocar o corpo destas funções por uma
// chamada a `apiClient.get(ENDPOINTS.dashboard)` não deve exigir nenhuma
// mudança na página Dashboard, só aqui.
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
