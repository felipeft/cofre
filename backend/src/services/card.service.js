const cardRepository = require('../repositories/card.repository')
const transactionRepository = require('../repositories/transaction.repository')
const cardPaymentRepository = require('../repositories/cardPayment.repository')
const recurringExpenseRepository = require('../repositories/recurringExpense.repository')
const { mapCardRow } = require('../utils/mappers/card.mapper')
const { calculateCardLimitUsage } = require('../domain/cardLimit')
const NotFoundError = require('../errors/NotFoundError')
const ConflictError = require('../errors/ConflictError')

async function findExistingOrThrow(userId, id) {
  const row = await cardRepository.findById(userId, id)
  if (!row) throw new NotFoundError(`Cartão ${id} não encontrado.`)
  return row
}

async function assertNotDuplicate(userId, name, { excludeId } = {}) {
  const existing = await cardRepository.findByName(userId, name, { excludeId })
  if (existing) {
    throw new ConflictError(`Já existe um cartão chamado "${name}".`)
  }
}

async function listCards(userId, { includeInactive }) {
  return (await cardRepository.findAll(userId, { includeInactive })).map(mapCardRow)
}

async function getCardById(userId, id) {
  return mapCardRow(await findExistingOrThrow(userId, id))
}

async function createCard(userId, input) {
  await assertNotDuplicate(userId, input.name)
  const row = await cardRepository.create(userId, input)
  return mapCardRow(row)
}

async function updateCard(userId, id, patch) {
  await findExistingOrThrow(userId, id)
  if (patch.name !== undefined) {
    await assertNotDuplicate(userId, patch.name, { excludeId: id })
  }
  const row = await cardRepository.update(userId, id, patch)
  return mapCardRow(row)
}

// DELETE significa exclusão física. Um cartão referenciado não pode ser
// apagado sem apagar a história financeira que ele identifica; em vez de
// escondê-lo via soft delete, recusamos a operação de forma explícita.
async function deleteCard(userId, id) {
  await findExistingOrThrow(userId, id)

  const isUsed =
    (await transactionRepository.existsByCardId(userId, id)) ||
    (await cardPaymentRepository.existsByCardId(userId, id)) ||
    (await recurringExpenseRepository.existsByCardId(userId, id))

  if (isUsed) {
    throw new ConflictError('Não é possível excluir um cartão que possui transações, recorrências ou pagamentos. Exclua ou ajuste os registros vinculados primeiro.')
  }

  await cardRepository.remove(userId, id)
  return { card: null }
}

async function getCardDeletionPreview(userId, id) {
  const card = mapCardRow(await findExistingOrThrow(userId, id))
  const impact = await cardRepository.deletionPreview(userId, id)
  const transactions = Number(impact.transactions)
  const recurringExpenses = Number(impact.recurring_expenses)
  const payments = Number(impact.payments)
  return {
    card,
    transactions,
    recurringExpenses,
    payments,
    purchasesTotal: Number(impact.purchases_total),
    canDelete: transactions === 0 && recurringExpenses === 0 && payments === 0,
  }
}

// GET /cards/:id/summary — limite total, usado e disponível (ver
// domain/cardLimit.js para a regra de cálculo).
async function getCardSummary(userId, id) {
  const cardRow = await findExistingOrThrow(userId, id)
  const openTransactions = await transactionRepository.findOpenByCardId(userId, id)
  const payments = await cardPaymentRepository.findByCardId(userId, id)

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

async function registerPayment(userId, id, input) {
  const card = await findExistingOrThrow(userId, id)
  const summary = await getCardSummary(userId, id)
  if (input.amount > summary.usedLimit) {
    throw new ConflictError(`O pagamento não pode exceder o limite atualmente utilizado (${summary.usedLimit}).`)
  }
  const row = await cardPaymentRepository.create(userId, { cardId: card.id, ...input })
  return { payment: require('../utils/mappers/cardPayment.mapper').mapCardPaymentRow(row), summary: await getCardSummary(userId, id) }
}

module.exports = { listCards, getCardById, getCardDeletionPreview, createCard, updateCard, deleteCard, getCardSummary, registerPayment }
