// Um único lugar com todos os caminhos da API. Quando o backend existir,
// nenhum Service precisará ser vasculhado atrás de strings soltas — é tudo aqui.
export const ENDPOINTS = {
  transactions: '/transactions',
  transaction: (id) => `/transactions/${id}`,
  categories: '/categories',
  category: (id) => `/categories/${id}`,
  dashboard: '/dashboard',
  analytics: '/analytics',
  auth: {
    google: '/auth/google',
    session: '/auth/session',
  },
  sheets: {
    sync: '/integrations/google-sheets/sync',
  },
}
