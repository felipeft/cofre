import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as transactionService from '@/services/transaction.service'

const TransactionsContext = createContext(null)

// O Context coordena mutações, mas não carrega todo o histórico na abertura.
// Dashboard/Análises consultam somente a janela necessária e o Histórico é
// paginado. `version` conecta esses consumidores: toda mutação feita por aqui
// incrementa o contador, e o hook do Histórico o inclui nas dependências do
// seu próprio fetch — assim, registrar uma transação pelo botão rápido
// enquanto o Histórico está aberto atualiza a lista sem recarregar a página,
// mesmo sem os dois lados compartilharem o mesmo array.
export function TransactionsProvider({ children }) {
  const [version, setVersion] = useState(0)

  const addTransaction = useCallback(async (payload) => {
    const created = await transactionService.createTransaction(payload)
    setVersion((v) => v + 1)
    return created
  }, [])

  const updateTransaction = useCallback(async (id, patch) => {
    const updated = await transactionService.updateTransaction(id, patch)
    setVersion((v) => v + 1)
    return updated
  }, [])

  const deleteTransaction = useCallback(async (id) => {
    await transactionService.deleteTransaction(id)
    setVersion((v) => v + 1)
  }, [])

  const value = useMemo(
    () => ({ version, addTransaction, updateTransaction, deleteTransaction }),
    [version, addTransaction, updateTransaction, deleteTransaction]
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactionsContext must be used within TransactionsProvider')
  return ctx
}
