// Camada de acesso a dados de movimentações. Mesma regra do category.service:
// ninguém fora daqui fala com o backend diretamente.
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'

function buildQuery(params) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    usp.set(key, value)
  })
  const query = usp.toString()
  return query ? `?${query}` : ''
}

// Página única, paginada — usada pelo Histórico, que controla page/limit/
// filtros/ordenação e não deve carregar a lista inteira para filtrar no
// cliente.
export async function getTransactions(params = {}) {
  const query = buildQuery(params)
  const { data, meta } = await apiClient.get(`${ENDPOINTS.transactions}${query}`)
  return { data, meta }
}

// O Dashboard e as Análises precisam do conjunto (praticamente) completo
// para calcular somas/tendências de vários meses — não faz sentido paginar
// isso na UI. Busca em lotes de 100 (o máximo aceito pela API) até cobrir o
// `total` informado pelo backend, em vez de assumir que uma página é
// suficiente.
export async function getAllTransactions(params = {}) {
  const limit = 100
  let page = 1
  let all = []
  let total = Infinity

  while (all.length < total) {
    const { data, meta } = await getTransactions({ ...params, page, limit, sortBy: 'date', sortDir: 'desc' })
    all = all.concat(data)
    total = meta?.total ?? all.length
    if (data.length === 0) break
    page += 1
  }

  return all
}

export async function createTransaction(payload) {
  const { data } = await apiClient.post(ENDPOINTS.transactions, payload)
  return data
}

export async function updateTransaction(id, patch) {
  const { data } = await apiClient.put(ENDPOINTS.transaction(id), patch)
  return data
}

export async function deleteTransaction(id) {
  await apiClient.delete(ENDPOINTS.transaction(id))
  return { id }
}
