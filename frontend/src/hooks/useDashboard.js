import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { getDashboardOverview } from '@/services/dashboard.service'

const FALLBACK_CATEGORY = { name: '—', color: '#8b8b93', icon: 'MoreHorizontal' }

export function useDashboard() {
  const { transactions, loading: transactionsLoading, error: transactionsError } = useTransactions()
  const { getCategoryById, loading: categoriesLoading } = useCategories()

  const overview = useMemo(() => {
    const base = getDashboardOverview(transactions)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, getCategoryById])

  return { ...overview, loading: transactionsLoading || categoriesLoading, error: transactionsError }
}
