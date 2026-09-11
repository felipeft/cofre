import { useMemo } from 'react'
import { LogIn, ShieldCheck, Vault } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { login, error } = useAuth()
  const oauthError = useMemo(() => {
    const reason = new URLSearchParams(window.location.search).get('auth_error')
    if (reason === 'not_allowed') return 'Esta conta Google não está autorizada a acessar o Cofre.'
    if (reason === 'failed') return 'Não foi possível concluir o login. Tente novamente.'
    return null
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-5">
      <section className="w-full max-w-[400px] rounded-card border border-border bg-surface p-7 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-income/15 text-income"><Vault size={22} /></div>
          <div><h1 className="text-xl font-semibold tracking-tight">Cofre</h1><p className="text-sm text-text-muted">Suas finanças, com acesso privado.</p></div>
        </div>
        <div className="mb-6 flex gap-3 rounded-control bg-surface-2 p-3 text-sm text-text-muted">
          <ShieldCheck className="mt-0.5 shrink-0 text-income" size={18} />
          <p>Entre com uma conta autorizada. Sua sessão fica protegida em um cookie HTTP-only.</p>
        </div>
        {(oauthError || error) && <p role="alert" className="mb-4 rounded-control border border-expense/30 bg-expense-soft p-3 text-sm text-expense">{oauthError || error}</p>}
        <button onClick={login} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-control bg-income font-semibold text-black transition-all hover:brightness-110">
          <LogIn size={18} /> Entrar com Google
        </button>
      </section>
    </main>
  )
}
