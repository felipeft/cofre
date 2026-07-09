import { LayoutGrid, History, PieChart, Tags, Settings } from 'lucide-react'

export const navItems = [
  { to: '/', label: 'Início', icon: LayoutGrid },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/analitico', label: 'Análises', icon: PieChart },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/configuracoes', label: 'Ajustes', icon: Settings },
]
