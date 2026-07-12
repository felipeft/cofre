// Camada de acesso a dados de movimentações. Mesma regra do category.service:
// ninguém fora daqui importa `data/transactions.mock.js` diretamente.
import { mockTransactions } from '@/data/transactions.mock'
// import { apiClient } from '@/api/client'
// import { ENDPOINTS } from '@/api/endpoints'

export function getTransactions() {
  // Futuro: return apiClient.get(ENDPOINTS.transactions)
  return mockTransactions
}

export function createTransaction(payload) {
  // Futuro: return apiClient.post(ENDPOINTS.transactions, payload)
  return { ...payload, id: Date.now() }
}

export function updateTransaction(id, patch) {
  // Futuro: return apiClient.put(ENDPOINTS.transaction(id), patch)
  return { id, ...patch }
}

export function deleteTransaction(id) {
  // Futuro: return apiClient.delete(ENDPOINTS.transaction(id))
  return { id }
}
