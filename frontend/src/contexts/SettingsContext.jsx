import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { settingsService } from '@/services/settings.service'
import { applyResolvedTheme } from '@/utils/theme'

export const SettingsContext = createContext(null)

const FALLBACK_SETTINGS = {
  theme: 'system',
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

  useEffect(() => {
    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
    const apply = () => applyResolvedTheme(settings.theme ?? 'system', mediaQuery)
    apply()

    if (settings.theme !== 'system' || !mediaQuery) return undefined
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', apply)
      return () => mediaQuery.removeEventListener('change', apply)
    }
    mediaQuery.addListener?.(apply)
    return () => mediaQuery.removeListener?.(apply)
  }, [settings.theme])

  const update = useCallback(async (patch) => {
    const response = await settingsService.update(patch)
    setSettings(response.data)
    setError(null)
    return response.data
  }, [])

  const value = useMemo(() => ({ settings, loading, error, refresh, update }), [settings, loading, error, refresh, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
