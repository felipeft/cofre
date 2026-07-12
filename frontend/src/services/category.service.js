// Camada de acesso a dados de categorias. Nenhuma página ou hook deve
// importar `data/categories.mock.js` diretamente — tudo passa por aqui.
//
// As funções são síncronas por enquanto porque a fonte é um mock em memória;
// no dia em que o backend existir, o corpo de cada função troca para usar
// `apiClient` (comentado abaixo) e passa a retornar uma Promise. Quem
// consome este Service (os hooks) já está preparado: um `await` extra não
// muda nenhum comportamento visível hoje, então adiar essa troca não é
// otimização prematura, é só não inventar `async` onde ainda não há nada
// assíncrono de verdade.
import { mockCategories } from '@/data/categories.mock'
// import { apiClient } from '@/api/client'
// import { ENDPOINTS } from '@/api/endpoints'

export function getCategories() {
  // Futuro: return apiClient.get(ENDPOINTS.categories)
  return mockCategories
}

export function getCategoryById(id, categories = mockCategories) {
  return categories.find((c) => c.id === id) ?? categories[categories.length - 1]
}

export function createCategory(payload) {
  // Futuro: return apiClient.post(ENDPOINTS.categories, payload)
  return { ...payload, id: `${payload.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` }
}

export function updateCategory(id, patch) {
  // Futuro: return apiClient.put(ENDPOINTS.category(id), patch)
  return { id, ...patch }
}

export function deleteCategory(id) {
  // Futuro: return apiClient.delete(ENDPOINTS.category(id))
  return { id }
}
