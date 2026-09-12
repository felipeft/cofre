import { apiClient } from '@cofre-api-client'
import { ENDPOINTS } from '@/api/endpoints'

export const authService = {
  getSession: () => apiClient.get(ENDPOINTS.auth.me),
  beginGoogleLogin: () => window.location.assign(apiClient.url(ENDPOINTS.auth.google)),
  logout: () => apiClient.post(ENDPOINTS.auth.logout),
}
