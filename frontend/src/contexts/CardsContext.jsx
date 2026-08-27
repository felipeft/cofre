import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as cardService from '@/services/card.service'

const CardsContext = createContext(null)

// Mesmo raciocínio do CategoriesContext: cartão é usado em mais de um lugar
// independente (formulário de lançamento, página de gerenciamento, filtros
// futuros do Histórico) — uma única lista compartilhada garante que criar
// ou desativar um cartão em qualquer lugar reflita em todo o app na hora.
export function CardsProvider({ children }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await cardService.getCards()
      setCards(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCard = useCallback(async (payload) => {
    const created = await cardService.createCard(payload)
    setCards((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    return created
  }, [])

  const editCard = useCallback(async (id, patch) => {
    const updated = await cardService.updateCard(id, patch)
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  // Excluir pode virar uma desativação lógica no backend (cartão em uso por
  // transações) — nesse caso ele some da lista padrão (a listagem já vem
  // sem inativos por padrão), sem tratamento especial aqui.
  const removeCard = useCallback(async (id) => {
    const result = await cardService.deleteCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
    return result
  }, [])

  const getCardById = useCallback((id) => cards.find((c) => c.id === id) ?? null, [cards])

  const value = useMemo(
    () => ({ cards, loading, error, refresh, createCard, editCard, removeCard, getCardById }),
    [cards, loading, error, refresh, createCard, editCard, removeCard, getCardById]
  )

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
}

export function useCardsContext() {
  const ctx = useContext(CardsContext)
  if (!ctx) throw new Error('useCardsContext must be used within CardsProvider')
  return ctx
}
