import { apiClient } from '@cofre-api-client'
import { ENDPOINTS } from '@/api/endpoints'

export async function getRecurringExpenses({ includeInactive } = {}) {
  const suffix = includeInactive ? '?includeInactive=true' : ''
  const { data } = await apiClient.get(`${ENDPOINTS.recurringExpenses}${suffix}`)
  return data
}
export async function createRecurringExpense(payload) { const { data } = await apiClient.post(ENDPOINTS.recurringExpenses, payload); return data }
export async function updateRecurringExpense(id, patch) { const { data } = await apiClient.put(ENDPOINTS.recurringExpense(id), patch); return data }
export async function getRecurringExpenseDeletionPreview(id) { const { data } = await apiClient.get(ENDPOINTS.recurringExpenseDeletionPreview(id)); return data }
export async function deleteRecurringExpense(id, mode) { const { data, message } = await apiClient.delete(ENDPOINTS.recurringExpense(id), { mode, confirmation: 'EXCLUIR RECORRÊNCIA' }); return { ...data, message } }
