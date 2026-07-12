import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as transactionService from '@/services/transaction.service'

const STORAGE_KEY = 'cofre:transactions'
const TransactionsContext = createContext(null)

// O Context é o cache local (com persistência em localStorage) das
// transações — o mesmo papel que teria um cache de query (ex: React Query)
// na frente de uma API real. Toda leitura/escrita passa pelo
// transaction.service, que é quem decide (hoje: mock; amanhã: apiClient)
// de onde os dados vêm.
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage corrompido — cai para o dataset do service
  }
  return transactionService.getTransactions()
}

export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    } catch {
      // storage indisponível — não é crítico para um frontend mockado
    }
  }, [transactions])

  const addTransaction = (payload) => {
    const created = transactionService.createTransaction(payload)
    setTransactions((prev) => [created, ...prev])
  }

  const updateTransaction = (id, patch) => {
    const updated = transactionService.updateTransaction(id, patch)
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)))
  }

  const deleteTransaction = (id) => {
    transactionService.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const value = useMemo(
    () => ({ transactions, addTransaction, updateTransaction, deleteTransaction }),
    [transactions]
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactionsContext must be used within TransactionsProvider')
  return ctx
}
