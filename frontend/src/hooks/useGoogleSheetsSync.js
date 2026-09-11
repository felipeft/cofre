import { useCallback, useEffect, useState } from 'react'
import { googleSheetsService } from '@/services/googleSheets.service'

export function useGoogleSheetsSync() {
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setError(null)
    const [statusResponse, historyResponse] = await Promise.all([
      googleSheetsService.getSyncStatus(),
      googleSheetsService.getSyncHistory(),
    ])
    setStatus(statusResponse.data)
    setHistory(historyResponse.data)
    return statusResponse.data
  }, [])

  useEffect(() => {
    setLoading(true)
    refresh().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [refresh])

  const synchronize = useCallback(async () => {
    setSyncing(true); setError(null)
    try {
      const response = await googleSheetsService.synchronize(globalThis.crypto.randomUUID())
      await refresh()
      return response.data
    } catch (requestError) {
      setError(requestError.message)
      await refresh().catch(() => {})
      throw requestError
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  return { status, history, loading, syncing, error, refresh, synchronize }
}
