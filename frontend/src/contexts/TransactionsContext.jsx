import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as transactionService from '@/services/transaction.service'

const TransactionsContext = createContext(null)

// O Context guarda o conjunto (quase) completo de transações — usado pelo
// Dashboard e pelas Análises, que precisam agregar vários meses de uma vez.
// O Histórico NÃO lê esse array: ele busca sua própria página filtrada
// direto da API (ver hooks/useTransactionsList.js), porque carregar tudo só
// para filtrar no cliente é exatamente o que a paginação do backend existe
// para evitar.
//
// `version` é o que conecta os dois mundos: toda mutação feita por aqui
// incrementa o contador, e o hook do Histórico o inclui nas dependências do
// seu próprio fetch — assim, registrar uma transação pelo botão rápido
// enquanto o Histórico está aberto atualiza a lista sem recarregar a página,
// mesmo sem os dois lados compartilharem o mesmo array.
export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await transactionService.getAllTransactions()
      setTransactions(all)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addTransaction = useCallback(async (payload) => {
    const created = await transactionService.createTransaction(payload)
    // Uma compra parcelada (cardId + installmentTotal > 1) faz o backend
    // devolver várias transações de uma vez (`{ transactions: [...] }`) em
    // vez de uma única — normaliza aqui para que quem chama `addTransaction`
    // (formulário de lançamento) não precise saber dessa diferença.
    const createdList = Array.isArray(created?.transactions) ? created.transactions : [created]
    setTransactions((prev) => [...createdList, ...prev])
    setVersion((v) => v + 1)
    return created
  }, [])

  const updateTransaction = useCallback(async (id, patch) => {
    const updated = await transactionService.updateTransaction(id, patch)
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
    setVersion((v) => v + 1)
    return updated
  }, [])

  const deleteTransaction = useCallback(async (id) => {
    await transactionService.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setVersion((v) => v + 1)
  }, [])

  const value = useMemo(
    () => ({ transactions, loading, error, version, refresh, addTransaction, updateTransaction, deleteTransaction }),
    [transactions, loading, error, version, refresh, addTransaction, updateTransaction, deleteTransaction]
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactionsContext must be used within TransactionsProvider')
  return ctx
}
