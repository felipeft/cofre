import { useTransactionsContext } from '@/contexts/TransactionsContext'

// Transações são estado verdadeiramente global (usado por Dashboard,
// Histórico, Registrar e o modal rápido no AppShell), então o Context é o
// lugar certo para guardar esse estado. Este hook existe como a porta de
// entrada única que as páginas usam — elas não sabem (nem precisam saber)
// que por trás disso existe um Context. Se um dia o estado global migrar
// para outra solução (ex: Zustand), só este arquivo muda.
export function useTransactions() {
  return useTransactionsContext()
}
