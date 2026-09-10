import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'

export async function getRecurringExpenses({ includeInactive } = {}) {
  const suffix = includeInactive ? '?includeInactive=true' : ''
  const { data } = await apiClient.get(`${ENDPOINTS.recurringExpenses}${suffix}`)
  return data
}
export async function createRecurringExpense(payload) { const { data } = await apiClient.post(ENDPOINTS.recurringExpenses, payload); return data }
export async function updateRecurringExpense(id, patch) { const { data } = await apiClient.put(ENDPOINTS.recurringExpense(id), patch); return data }
// A API interpreta DELETE como desativação lógica para preservar o histórico.
export async function deleteRecurringExpense(id) { const { data, message } = await apiClient.delete(ENDPOINTS.recurringExpense(id)); return { ...data, message } }
