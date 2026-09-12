import { apiClient } from '@cofre-api-client'
import { ENDPOINTS } from '@/api/endpoints'

export const settingsService = {
  get: () => apiClient.get(ENDPOINTS.settings),
  update: (patch) => apiClient.patch(ENDPOINTS.settings, patch),
  getProfile: () => apiClient.get(ENDPOINTS.profile),
  updateProfile: (patch) => apiClient.patch(ENDPOINTS.profile, patch),
}
