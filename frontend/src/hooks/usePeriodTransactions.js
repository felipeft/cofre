import { useEffect, useRef, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { getAllTransactions } from '@/services/transaction.service'
import { monthDateRange } from '@/utils/months'

export function usePeriodTransactions(selectedMonth, months = 6) {
  const { version } = useTransactions()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const range = monthDateRange(selectedMonth, months)
    setLoading(true)
    setError(null)

    getAllTransactions(range)
      .then((data) => {
        if (requestId === requestIdRef.current) setTransactions(data)
      })
      .catch((requestError) => {
        if (requestId === requestIdRef.current) setError(requestError)
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [selectedMonth, months, version])

  return { transactions, loading, error }
}
