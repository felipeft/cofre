import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { settingsService } from '@/services/settings.service'
import { DEFAULT_OFFER_RATE, DEFAULT_TITHE_RATE } from '@/constants/financialRules'

export const SettingsContext = createContext(null)

const FALLBACK_SETTINGS = {
  defaultOfferRate: DEFAULT_OFFER_RATE,
  defaultTitheRate: DEFAULT_TITHE_RATE,
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await settingsService.get()
      setSettings(response.data)
      return response.data
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  const update = useCallback(async (patch) => {
    const response = await settingsService.update(patch)
    setSettings(response.data)
    setError(null)
    return response.data
  }, [])

  const value = useMemo(() => ({ settings, loading, error, refresh, update }), [settings, loading, error, refresh, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
