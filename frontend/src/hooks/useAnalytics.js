import { useMemo } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { getAnalyticsOverview } from '@/services/analytics.service'
import { usePeriodTransactions } from '@/hooks/usePeriodTransactions'

const FALLBACK_CATEGORY = { name: '—', color: '#8b8b93', icon: 'MoreHorizontal' }

export function useAnalytics(selectedMonth) {
  const { transactions, loading: transactionsLoading, error: transactionsError } = usePeriodTransactions(selectedMonth)
  const { getCategoryById, loading: categoriesLoading } = useCategories()

  const overview = useMemo(() => {
    const base = getAnalyticsOverview(transactions, selectedMonth)
    return {
      ...base,
      breakdown: base.breakdown.map((b) => ({ ...b, category: getCategoryById(b.categoryId) ?? FALLBACK_CATEGORY })),
      // Maiores gastos já vêm com `category` embutido pela API (join no
      // backend) — não precisa resolver de novo.
      topExpenses: base.topExpenses,
    }
  }, [transactions, getCategoryById, selectedMonth])

  return { ...overview, loading: transactionsLoading || categoriesLoading, error: transactionsError }
}
