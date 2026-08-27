// Camada de acesso a dados de cartões. Mesma regra dos demais services:
// ninguém fora daqui fala com o backend diretamente.
import { apiClient } from '@/api/client'
import { ENDPOINTS } from '@/api/endpoints'

function buildQuery(params) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    usp.set(key, value)
  })
  const query = usp.toString()
  return query ? `?${query}` : ''
}

export async function getCards({ includeInactive } = {}) {
  const query = buildQuery({ includeInactive: includeInactive ? 'true' : undefined })
  const { data } = await apiClient.get(`${ENDPOINTS.cards}${query}`)
  return data
}

export async function createCard(payload) {
  const { data } = await apiClient.post(ENDPOINTS.cards, payload)
  return data
}

export async function updateCard(id, patch) {
  const { data } = await apiClient.put(ENDPOINTS.card(id), patch)
  return data
}

// O backend pode responder com uma exclusão de verdade OU uma desativação
// lógica (cartão em uso por transações) — devolve os dois sinais para quem
// chamou decidir a mensagem certa a mostrar (mesmo padrão de
// category.service.deleteCategory).
export async function deleteCard(id) {
  const { data, message } = await apiClient.delete(ENDPOINTS.card(id))
  return { ...data, message }
}

// Limite total/usado/disponível — o backend é a única fonte de verdade
// desse cálculo (nunca recalculado no cliente).
export async function getCardSummary(id) {
  const { data } = await apiClient.get(ENDPOINTS.cardSummary(id))
  return data
}
