import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from '@/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import RegisterTransaction from '@/pages/RegisterTransaction'
import History from '@/pages/History'
import Analytics from '@/pages/Analytics'
import Categories from '@/pages/Categories'
import Cards from '@/pages/Cards'
import RecurringExpenses from '@/pages/RecurringExpenses'
import Settings from '@/pages/Settings'
import { TransactionsProvider } from '@/contexts/TransactionsContext'
import { CategoriesProvider } from '@/contexts/CategoriesContext'
import { CardsProvider } from '@/contexts/CardsContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { RecurringExpensesProvider } from '@/contexts/RecurringExpensesContext'
import { ROUTES } from '@/constants/routes'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGate from '@/components/auth/AuthGate'
import { SettingsProvider } from '@/contexts/SettingsContext'

function AuthenticatedApp() {
  return (
    <SettingsProvider>
      <CategoriesProvider>
        <CardsProvider>
          <RecurringExpensesProvider>
            <TransactionsProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path={ROUTES.dashboard} element={<Dashboard />} />
                  <Route path={ROUTES.register} element={<RegisterTransaction />} />
                  <Route path={ROUTES.history} element={<History />} />
                  <Route path={ROUTES.analytics} element={<Analytics />} />
                  <Route path={ROUTES.categories} element={<Categories />} />
                  <Route path={ROUTES.cards} element={<Cards />} />
                  <Route path={ROUTES.recurringExpenses} element={<RecurringExpenses />} />
                  <Route path={ROUTES.settings} element={<Settings />} />
                </Route>
              </Routes>
            </TransactionsProvider>
          </RecurringExpensesProvider>
        </CardsProvider>
      </CategoriesProvider>
    </SettingsProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthGate><AuthenticatedApp /></AuthGate>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
