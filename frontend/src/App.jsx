import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import RegisterTransaction from '@/pages/RegisterTransaction'
import History from '@/pages/History'
import Analytics from '@/pages/Analytics'
import Categories from '@/pages/Categories'
import Settings from '@/pages/Settings'
import { TransactionsProvider } from '@/context/TransactionsContext'
import { ToastProvider } from '@/context/ToastContext'

export default function App() {
  return (
    <TransactionsProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/registrar" element={<RegisterTransaction />} />
              <Route path="/historico" element={<History />} />
              <Route path="/analitico" element={<Analytics />} />
              <Route path="/categorias" element={<Categories />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </TransactionsProvider>
  )
}
