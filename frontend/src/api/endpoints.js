// Um único lugar com todos os caminhos da API. Nenhum Service (muito menos
// uma página) deve ter uma URL solta — é tudo aqui.
//
// Não há endpoints dedicados de dashboard/analytics: o backend ainda não os
// expõe, então esses indicadores continuam calculados no cliente a partir de
// GET /transactions (ver dashboard.service.js e analytics.service.js). Se um
// endpoint dedicado existir no futuro, adiciona-se a entrada aqui e troca-se
// o corpo desses dois Services — nenhuma página muda.
export const ENDPOINTS = {
  transactions: '/transactions',
  transaction: (id) => `/transactions/${id}`,
  categories: '/categories',
  category: (id) => `/categories/${id}`,
  cards: '/cards',
  card: (id) => `/cards/${id}`,
  cardSummary: (id) => `/cards/${id}/summary`,
  cardPayments: (id) => `/cards/${id}/payments`,
  recurringExpenses: '/recurring-expenses',
  recurringExpense: (id) => `/recurring-expenses/${id}`,
  settings: '/settings',
  profile: '/profile',
  auth: {
    google: '/auth/google',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  sheets: {
    status: '/integrations/google-sheets',
    connect: '/integrations/google-sheets/connect',
    spreadsheet: '/integrations/google-sheets/spreadsheet',
    export: '/integrations/google-sheets/export',
    importPreview: '/integrations/google-sheets/import/preview',
    import: '/integrations/google-sheets/import',
    sync: '/integrations/google-sheets/sync',
    syncHistory: '/integrations/google-sheets/sync/history',
  },
}
