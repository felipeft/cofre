import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as service from '@/services/recurringExpense.service'

const RecurringExpensesContext = createContext(null)
export function RecurringExpensesProvider({ children }) {
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRecurringExpenses(await service.getRecurringExpenses({ includeInactive: true })) } catch (err) { setError(err) } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const createRecurringExpense = useCallback(async (payload) => { const created = await service.createRecurringExpense(payload); setRecurringExpenses((prev) => [...prev, created]); return created }, [])
  const editRecurringExpense = useCallback(async (id, patch) => { const updated = await service.updateRecurringExpense(id, patch); setRecurringExpenses((prev) => prev.map((item) => item.id === id ? updated : item)); return updated }, [])
  const removeRecurringExpense = useCallback(async (id, mode) => { const result = await service.deleteRecurringExpense(id, mode); setRecurringExpenses((prev) => prev.filter((item) => item.id !== id)); return result }, [])
  const value = useMemo(() => ({ recurringExpenses, loading, error, refresh, createRecurringExpense, editRecurringExpense, removeRecurringExpense }), [recurringExpenses, loading, error, refresh, createRecurringExpense, editRecurringExpense, removeRecurringExpense])
  return <RecurringExpensesContext.Provider value={value}>{children}</RecurringExpensesContext.Provider>
}
export function useRecurringExpensesContext() { const ctx = useContext(RecurringExpensesContext); if (!ctx) throw new Error('useRecurringExpenses must be used within RecurringExpensesProvider'); return ctx }
