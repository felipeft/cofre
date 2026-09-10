const cardRepository = require('../repositories/card.repository')
const transactionRepository = require('../repositories/transaction.repository')
const cardPaymentRepository = require('../repositories/cardPayment.repository')
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

// DELETE significa exclusão física. Um cartão referenciado não pode ser
// apagado sem apagar a história financeira que ele identifica; em vez de
// escondê-lo via soft delete, recusamos a operação de forma explícita.
function deleteCard(id) {
  findExistingOrThrow(id)

  const isUsed = transactionRepository.existsByCardId(id) || cardPaymentRepository.existsByCardId(id)

  if (isUsed) {
    throw new ConflictError('Não é possível excluir um cartão que possui transações ou pagamentos. Exclua os registros vinculados primeiro.')
  }

  cardRepository.remove(id)
  return { card: null }
}

// GET /cards/:id/summary — limite total, usado e disponível (ver
// domain/cardLimit.js para a regra de cálculo).
function getCardSummary(id) {
  const cardRow = findExistingOrThrow(id)
  const openTransactions = transactionRepository.findOpenByCardId(id)
  const payments = cardPaymentRepository.findByCardId(id)

  const usage = calculateCardLimitUsage({
    creditLimit: cardRow.credit_limit,
    openTransactions,
    payments,
  })

  return {
    id: cardRow.id,
    name: cardRow.name,
    creditLimit: usage.creditLimit,
    usedLimit: usage.usedLimit,
    availableLimit: usage.availableLimit,
    purchasesTotal: usage.purchasesTotal,
    paidAmount: usage.paidAmount,
    closingDay: cardRow.closing_day,
    dueDay: cardRow.due_day,
    isActive: Boolean(cardRow.is_active),
  }
}

function registerPayment(id, input) {
  const card = findExistingOrThrow(id)
  const summary = getCardSummary(id)
  if (input.amount > summary.usedLimit) {
    throw new ConflictError(`O pagamento não pode exceder o limite atualmente utilizado (${summary.usedLimit}).`)
  }
  const row = cardPaymentRepository.create({ cardId: card.id, ...input })
  return { payment: require('../utils/mappers/cardPayment.mapper').mapCardPaymentRow(row), summary: getCardSummary(id) }
}

module.exports = { listCards, getCardById, createCard, updateCard, deleteCard, getCardSummary, registerPayment }
