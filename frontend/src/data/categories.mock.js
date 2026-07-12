// Dado mockado — representa exatamente o payload que a rota GET /categories
// deverá devolver quando o backend existir. Nenhuma lógica aqui, só dados.
// `icon` é o nome de um ícone lucide-react, resolvido por CategoryIcon.jsx.
export const mockCategories = [
  { id: 'mercado', name: 'Mercado', icon: 'ShoppingCart', color: '#3ecf8e', type: 'expense' },
  { id: 'transporte', name: 'Transporte', icon: 'Car', color: '#5b9ef5', type: 'expense' },
  { id: 'alimentacao', name: 'Alimentação', icon: 'UtensilsCrossed', color: '#f5a25b', type: 'expense' },
  { id: 'moradia', name: 'Moradia', icon: 'Home', color: '#a78bfa', type: 'expense' },
  { id: 'saude', name: 'Saúde', icon: 'HeartPulse', color: '#f2666a', type: 'expense' },
  { id: 'lazer', name: 'Lazer', icon: 'Popcorn', color: '#f5c15b', type: 'expense' },
  { id: 'assinaturas', name: 'Assinaturas', icon: 'RefreshCw', color: '#5bc8f5', type: 'expense' },
  { id: 'educacao', name: 'Educação', icon: 'GraduationCap', color: '#7dd3a0', type: 'expense' },
  { id: 'outros', name: 'Outros', icon: 'MoreHorizontal', color: '#8b8b93', type: 'expense' },
  { id: 'salario', name: 'Salário', icon: 'Wallet', color: '#3ecf8e', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#3ecf8e', type: 'income' },
  { id: 'investimentos', name: 'Investimentos', icon: 'TrendingUp', color: '#3ecf8e', type: 'income' },
]
