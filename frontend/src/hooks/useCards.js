import { useCardsContext } from '@/contexts/CardsContext'

// Porta de entrada única para o Context de cartões — mesmo padrão de
// useCategories.js. O resto do app não sabe (nem precisa saber) que por
// trás existe um Context.
export function useCards() {
  return useCardsContext()
}
