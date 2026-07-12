import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { getDashboardOverview } from '@/services/dashboard.service'

export function useDashboard() {
  const { transactions } = useTransactions()
  const { getCategoryById } = useCategories()

  return useMemo(() => {
    const overview = getDashboardOverview(transactions)
    return {
      ...overview,
      recent: overview.recent.map((t) => ({ ...t, category: getCategoryById(t.categoryId) })),
      breakdown: overview.breakdown.map((b) => ({ ...b, category: getCategoryById(b.categoryId) })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])
}
