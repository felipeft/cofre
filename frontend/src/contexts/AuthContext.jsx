import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/auth.service'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, authenticated: false, user: null, error: null })

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const response = await authService.getSession()
      setState({ loading: false, authenticated: response.data.authenticated, user: response.data.user, error: null })
    } catch (error) {
      setState({ loading: false, authenticated: false, user: null, error: error.message })
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const unauthenticated = () => setState({ loading: false, authenticated: false, user: null, error: 'Sua sessão expirou. Entre novamente.' })
    window.addEventListener('cofre:unauthenticated', unauthenticated)
    return () => window.removeEventListener('cofre:unauthenticated', unauthenticated)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setState({ loading: false, authenticated: false, user: null, error: null })
  }, [])

  const applyProfile = useCallback((profile) => {
    setState((current) => ({
      ...current,
      user: current.user ? {
        ...current.user,
        name: profile.displayName,
        displayName: profile.displayName,
        googleName: profile.googleName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
      } : null,
    }))
  }, [])

  const value = useMemo(() => ({ ...state, refresh, logout, applyProfile, login: authService.beginGoogleLogin }), [state, refresh, logout, applyProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
