import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from '@/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import RegisterTransaction from '@/pages/RegisterTransaction'
import History from '@/pages/History'
import Analytics from '@/pages/Analytics'
import Categories from '@/pages/Categories'
import Cards from '@/pages/Cards'
import Settings from '@/pages/Settings'
import { TransactionsProvider } from '@/contexts/TransactionsContext'
import { CategoriesProvider } from '@/contexts/CategoriesContext'
import { CardsProvider } from '@/contexts/CardsContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ROUTES } from '@/constants/routes'

export default function App() {
  return (
    <CategoriesProvider>
      <CardsProvider>
        <TransactionsProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path={ROUTES.dashboard} element={<Dashboard />} />
                  <Route path={ROUTES.register} element={<RegisterTransaction />} />
                  <Route path={ROUTES.history} element={<History />} />
                  <Route path={ROUTES.analytics} element={<Analytics />} />
                  <Route path={ROUTES.categories} element={<Categories />} />
                  <Route path={ROUTES.cards} element={<Cards />} />
                  <Route path={ROUTES.settings} element={<Settings />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </TransactionsProvider>
      </CardsProvider>
    </CategoriesProvider>
  )
}
