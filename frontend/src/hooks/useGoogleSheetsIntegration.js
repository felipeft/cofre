import { useCallback, useEffect, useState } from 'react'
import { googleSheetsService } from '@/services/googleSheets.service'

export function useGoogleSheetsIntegration() {
  const [integration, setIntegration] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { const response = await googleSheetsService.getStatus(); setIntegration(response.data); return response.data }
    catch (requestError) { setError(requestError.message); throw requestError }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  const run = useCallback(async (name, operation) => {
    setAction(name); setError(null)
    try { return await operation() } catch (requestError) { setError(requestError.message); throw requestError }
    finally { setAction(null) }
  }, [])

  const createSpreadsheet = (year) => run('creating', async () => {
    const response = await googleSheetsService.createSpreadsheet(year); setIntegration(response.data); return response.data
  })
  const exportData = () => run('exporting', async () => { const response = await googleSheetsService.exportData(); await refresh(); return response.data })
  const previewImport = () => run('previewing', async () => { const response = await googleSheetsService.previewImport(); setPreview(response.data); return response.data })
  const confirmImport = () => run('importing', async () => { const response = await googleSheetsService.confirmImport(preview.fingerprint); setPreview(null); await refresh(); return response.data })
  const disconnect = () => run('disconnecting', async () => { await googleSheetsService.disconnect(); setPreview(null); await refresh() })

  return { integration, preview, loading, action, error, refresh, connect: googleSheetsService.connect, createSpreadsheet, exportData, previewImport, confirmImport, disconnect }
}
