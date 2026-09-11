import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'

export async function getDataDeletionPreview(operation) {
  const { data } = await apiClient.get(`${ENDPOINTS.dataManagement.preview}?operation=${encodeURIComponent(operation)}`)
  return data
}

export async function clearFinancialRecords(confirmation) {
  return apiClient.post(ENDPOINTS.dataManagement.clearRecords, { confirmation })
}

export async function resetCofre(confirmation) {
  return apiClient.post(ENDPOINTS.dataManagement.reset, { confirmation })
}
