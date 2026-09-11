import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/Login'
import AppIcon from '@/components/ui/AppIcon'

export default function AuthGate({ children }) {
  const { loading, authenticated } = useAuth()
  if (loading) return <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg text-text-muted"><AppIcon size={36} className="animate-pulse" /><p className="text-sm">Abrindo o Cofre…</p></div>
  if (!authenticated) return <Login />
  return children
}
