// Camada de acesso a dados de categorias. Nenhuma página ou hook fala com o
// backend diretamente — tudo passa por aqui, que é o único arquivo (fora de
// api/client.js) que conhece a forma exata da resposta da API.
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

export async function getCategories({ type, includeInactive } = {}) {
  const query = buildQuery({ type, includeInactive: includeInactive ? 'true' : undefined })
  const { data } = await apiClient.get(`${ENDPOINTS.categories}${query}`)
  return data
}

// Continua síncrona de propósito: é uma busca pura numa lista que os hooks já
// carregaram, não uma chamada de rede — não faz sentido devolver uma Promise
// para um `.find()`.
export function getCategoryById(id, categories = []) {
  return categories.find((c) => c.id === id) ?? null
}

export async function createCategory(payload) {
  const { data } = await apiClient.post(ENDPOINTS.categories, payload)
  return data
}

export async function updateCategory(id, patch) {
  const { data } = await apiClient.put(ENDPOINTS.category(id), patch)
  return data
}

export async function deleteCategory(id) {
  const { data, message } = await apiClient.delete(ENDPOINTS.category(id))
  return { ...data, message }
}
