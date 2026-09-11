import { Vault } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/Login'

export default function AuthGate({ children }) {
  const { loading, authenticated } = useAuth()
  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bg text-text-muted"><Vault className="animate-pulse text-income" size={30} /><p className="text-sm">Abrindo o Cofre…</p></div>
  if (!authenticated) return <Login />
  return children
}
