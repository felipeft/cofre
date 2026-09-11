import { useMemo } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { getDashboardOverview } from '@/services/dashboard.service'
import { usePeriodTransactions } from '@/hooks/usePeriodTransactions'

const FALLBACK_CATEGORY = { name: '—', color: '#8b8b93', icon: 'MoreHorizontal' }

export function useDashboard(selectedMonth) {
  const { transactions, loading: transactionsLoading, error: transactionsError } = usePeriodTransactions(selectedMonth)
  const { getCategoryById, loading: categoriesLoading } = useCategories()

  const overview = useMemo(() => {
    const base = getDashboardOverview(transactions, selectedMonth)
    return {
      ...base,
      // As transações recentes já vêm com `category` embutido pela API
      // (join no backend) — não precisa resolver de novo.
      recent: base.recent,
      // O breakdown por categoria é um agregado (soma por categoryId), então
      // não carrega categoria nenhuma — resolve aqui a partir da lista já
      // carregada pelo Context de categorias.
      breakdown: base.breakdown.map((b) => ({ ...b, category: getCategoryById(b.categoryId) ?? FALLBACK_CATEGORY })),
    }
  }, [transactions, getCategoryById, selectedMonth])

  return { ...overview, loading: transactionsLoading || categoriesLoading, error: transactionsError }
}
