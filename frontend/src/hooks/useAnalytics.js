import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { getAnalyticsOverview } from '@/services/analytics.service'

const FALLBACK_CATEGORY = { name: '—', color: '#8b8b93', icon: 'MoreHorizontal' }

export function useAnalytics() {
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions()
  const { getCategoryById, loading: categoriesLoading } = useCategories()

  const overview = useMemo(() => {
    const base = getAnalyticsOverview(transactions)
    return {
      ...base,
      breakdown: base.breakdown.map((b) => ({ ...b, category: getCategoryById(b.categoryId) ?? FALLBACK_CATEGORY })),
      // Maiores gastos já vêm com `category` embutido pela API (join no
      // backend) — não precisa resolver de novo.
      topExpenses: base.topExpenses,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, getCategoryById])

  return { ...overview, loading: transactionsLoading || categoriesLoading, error: transactionsError }
}
