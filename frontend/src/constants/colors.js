// Espelha exatamente os tokens definidos em `styles/index.css` (@theme).
// Necessário porque bibliotecas de gráfico (Recharts) recebem cor via prop
// JS, não conseguem ler `var(--color-*)` diretamente em todos os contextos.
// Qualquer mudança de paleta deve ser feita nos dois lugares.
export const SEMANTIC_COLORS = {
  income: '#3ecf8e',
  expense: '#f2666a',
  info: '#5b9ef5',
  alert: '#f5a25b',
}

export const CHART_GRID_COLOR = '#27272a'
export const CHART_TICK_COLOR = '#8b8b93'
