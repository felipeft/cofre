import { useCallback, useEffect, useRef, useState } from 'react'
import * as transactionService from '@/services/transaction.service'
import { useTransactions } from '@/hooks/useTransactions'

const SORT_MAP = {
  'date-desc': { sortBy: 'date', sortDir: 'desc' },
  'date-asc': { sortBy: 'date', sortDir: 'asc' },
  'amount-desc': { sortBy: 'amount', sortDir: 'desc' },
  'amount-asc': { sortBy: 'amount', sortDir: 'asc' },
}

const EMPTY_META = { page: 1, limit: 20, total: 0, totalPages: 0 }

// Busca a página atual do Histórico direto na API a cada mudança de filtro/
// ordenação/página — nunca carrega tudo para filtrar no cliente, é
// exatamente para isso que a paginação do backend existe.
export function useTransactionsList({ search, typeFilter, categoryFilter, sort, page, limit = 20 }) {
  const { version } = useTransactions()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)

  const fetchList = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const { sortBy, sortDir } = SORT_MAP[sort] ?? SORT_MAP['date-desc']
      const result = await transactionService.getTransactions({
        page,
        limit,
        q: search || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        sortBy,
        sortDir,
      })
      // Resposta de uma requisição já superada por um filtro mais recente —
      // ignora para não sobrescrever a tela com dado desatualizado.
      if (requestId !== requestIdRef.current) return
      setData(result.data)
      setMeta(result.meta)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [search, typeFilter, categoryFilter, sort, page, limit])

  useEffect(() => {
    fetchList()
    // `version` (do TransactionsContext) muda a cada mutação feita em
    // qualquer lugar do app — inclui aqui para que o Histórico se atualize
    // mesmo quando a mutação não veio dele.
  }, [fetchList, version])

  return { data, meta, loading, error, refetch: fetchList }
}
