import { apiClient } from '@cofre-api-client'
import { ENDPOINTS } from '@/api/endpoints'

export const resetDemo = () => apiClient.post(ENDPOINTS.demo.reset)
