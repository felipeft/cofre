import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { getAnalyticsOverview } from '@/services/analytics.service'

export function useAnalytics() {
  const { transactions } = useTransactions()
  const { getCategoryById } = useCategories()

  return useMemo(() => {
    const overview = getAnalyticsOverview(transactions)
    return {
      ...overview,
      breakdown: overview.breakdown.map((b) => ({ ...b, category: getCategoryById(b.categoryId) })),
      topExpenses: overview.topExpenses.map((t) => ({ ...t, category: getCategoryById(t.categoryId) })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])
}
