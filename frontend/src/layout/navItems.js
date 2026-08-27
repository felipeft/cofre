import { LayoutGrid, History, PieChart, Tags, CreditCard, Settings } from 'lucide-react'
import { ROUTES } from '@/constants/routes'

export const navItems = [
  { to: ROUTES.dashboard, label: 'Início', icon: LayoutGrid },
  { to: ROUTES.history, label: 'Histórico', icon: History },
  { to: ROUTES.cards, label: 'Cartões', icon: CreditCard },
  { to: ROUTES.analytics, label: 'Análises', icon: PieChart },
  { to: ROUTES.categories, label: 'Categorias', icon: Tags },
  { to: ROUTES.settings, label: 'Ajustes', icon: Settings },
]
