const cardRepository = require('../repositories/card.repository')
const transactionRepository = require('../repositories/transaction.repository')
const { mapCardRow } = require('../utils/mappers/card.mapper')
const { calculateCardLimitUsage } = require('../domain/cardLimit')
const NotFoundError = require('../errors/NotFoundError')
const ConflictError = require('../errors/ConflictError')

function findExistingOrThrow(id) {
  const row = cardRepository.findById(id)
  if (!row) throw new NotFoundError(`Cartão ${id} não encontrado.`)
  return row
}

function assertNotDuplicate(name, { excludeId } = {}) {
  const existing = cardRepository.findByName(name, { excludeId })
  if (existing) {
    throw new ConflictError(`Já existe um cartão chamado "${name}".`)
  }
}

function listCards({ includeInactive }) {
  return cardRepository.findAll({ includeInactive }).map(mapCardRow)
}

function getCardById(id) {
  return mapCardRow(findExistingOrThrow(id))
}

function createCard(input) {
  assertNotDuplicate(input.name)
  const row = cardRepository.create(input)
  return mapCardRow(row)
}

function updateCard(id, patch) {
  findExistingOrThrow(id)
  if (patch.name !== undefined) {
    assertNotDuplicate(patch.name, { excludeId: id })
  }
  const row = cardRepository.update(id, patch)
  return mapCardRow(row)
}

// Mesma filosofia de category.service.deleteCategory: um cartão com
// histórico de compras não pode ser removido de verdade (a FK ON DELETE
// RESTRICT recusaria de qualquer jeito), então vira uma desativação lógica.
// Sem transações associadas, remove de fato.
function deleteCard(id) {
  findExistingOrThrow(id)

  const isUsed = transactionRepository.existsByCardId(id)

  if (isUsed) {
    const row = cardRepository.setActive(id, false)
    return { card: mapCardRow(row), softDeleted: true }
  }

  cardRepository.remove(id)
  return { card: null, softDeleted: false }
}

// GET /cards/:id/summary — limite total, usado e disponível (ver
// domain/cardLimit.js para a regra de cálculo).
function getCardSummary(id) {
  const cardRow = findExistingOrThrow(id)
  const openTransactions = transactionRepository.findOpenByCardId(id)

  const usage = calculateCardLimitUsage({
    creditLimit: cardRow.credit_limit,
    openTransactions,
  })

  return {
    id: cardRow.id,
    name: cardRow.name,
    creditLimit: usage.creditLimit,
    usedLimit: usage.usedLimit,
    availableLimit: usage.availableLimit,
    closingDay: cardRow.closing_day,
    dueDay: cardRow.due_day,
    isActive: Boolean(cardRow.is_active),
  }
}

module.exports = { listCards, getCardById, createCard, updateCard, deleteCard, getCardSummary }
