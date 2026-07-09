import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { mockTransactions } from '@/services/mockTransactions'

const STORAGE_KEY = 'cofre:transactions'
const TransactionsContext = createContext(null)

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore corrupted storage, fall back to mock dataset
  }
  return mockTransactions
}

export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    } catch {
      // storage full or unavailable — non-critical for a mock frontend
    }
  }, [transactions])

  const addTransaction = (tx) => {
    setTransactions((prev) => [{ ...tx, id: Date.now() }, ...prev])
  }

  const updateTransaction = (id, patch) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const resetMockData = () => setTransactions(mockTransactions)

  const value = useMemo(
    () => ({ transactions, addTransaction, updateTransaction, deleteTransaction, resetMockData }),
    [transactions]
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider')
  return ctx
}
