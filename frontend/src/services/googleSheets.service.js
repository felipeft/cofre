import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'

export const googleSheetsService = {
  getStatus: () => apiClient.get(ENDPOINTS.sheets.status),
  connect: () => window.location.assign(apiClient.url(ENDPOINTS.sheets.connect)),
  createSpreadsheet: (startYear) => apiClient.post(ENDPOINTS.sheets.spreadsheet, { startYear }),
  exportData: () => apiClient.post(ENDPOINTS.sheets.export),
  previewImport: () => apiClient.post(ENDPOINTS.sheets.importPreview),
  confirmImport: (fingerprint) => apiClient.post(ENDPOINTS.sheets.import, { fingerprint }),
  getSyncStatus: () => apiClient.get(ENDPOINTS.sheets.sync),
  getSyncHistory: (limit = 20) => apiClient.get(`${ENDPOINTS.sheets.syncHistory}?limit=${limit}`),
  synchronize: (requestId) => apiClient.post(ENDPOINTS.sheets.sync, { requestId }),
  disconnect: () => apiClient.delete(ENDPOINTS.sheets.status),
}
