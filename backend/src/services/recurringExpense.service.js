const recurringExpenseRepository = require('../repositories/recurringExpense.repository')
const categoryRepository = require('../repositories/category.repository')
const cardRepository = require('../repositories/card.repository')
const { mapRecurringExpenseRow } = require('../utils/mappers/recurringExpense.mapper')
const { buildOccurrencesThrough, nextMonthStart } = require('../domain/recurringExpense')
const NotFoundError = require('../errors/NotFoundError')
const ValidationError = require('../errors/ValidationError')

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function assertRealDate(value, field) {
  const [year, month, day] = value.split('-').map(Number)
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate()
  if (!valid) throw new ValidationError(`${field} deve ser uma data válida.`, [{ field, message: 'Data inválida.' }])
}
async function findExistingOrThrow(userId, id) {
  const row = await recurringExpenseRepository.findById(userId, id)
  if (!row) throw new NotFoundError(`Gasto recorrente ${id} não encontrado.`)
  return row
}
async function assertExpenseCategory(userId, categoryId) {
  const category = await categoryRepository.findById(userId, categoryId)
  if (!category) throw new NotFoundError(`Categoria ${categoryId} não encontrada.`)
  if (category.type !== 'expense') throw new ValidationError('Gasto recorrente exige uma categoria de despesa.', [{ field: 'categoryId', message: "categoryId exige categoria type='expense'." }])
}
async function assertUsableCard(userId, cardId) {
  if (cardId == null) return
  const card = await cardRepository.findById(userId, cardId)
  if (!card) throw new NotFoundError(`Cartão ${cardId} não encontrado.`)
  if (!card.is_active) throw new ValidationError(`O cartão "${card.name}" está inativo e não aceita novas recorrências.`, [{ field: 'cardId', message: 'Cartão inativo.' }])
}
function assertDates(startDate, endDate) {
  assertRealDate(startDate, 'startDate')
  if (endDate != null) {
    assertRealDate(endDate, 'endDate')
    if (endDate < startDate) throw new ValidationError('endDate deve ser igual ou posterior a startDate.', [{ field: 'endDate', message: 'Data final anterior ao início.' }])
  }
}

async function listRecurringExpenses(userId, query) { return (await recurringExpenseRepository.findAll(userId, query)).map(mapRecurringExpenseRow) }
async function getRecurringExpenseById(userId, id) { return mapRecurringExpenseRow(await findExistingOrThrow(userId, id)) }
async function createRecurringExpense(userId, input) {
  await assertExpenseCategory(userId, input.categoryId); await assertUsableCard(userId, input.cardId); assertDates(input.startDate, input.endDate)
  const row = await recurringExpenseRepository.create(userId, { ...input, source: 'recurring' })
  await ensureRecurringExpensesGenerated(userId)
  return mapRecurringExpenseRow(await recurringExpenseRepository.findById(userId, row.id))
}
async function updateRecurringExpense(userId, id, patch) {
  const current = await findExistingOrThrow(userId, id)
  const categoryId = patch.categoryId ?? current.category_id
  const cardId = patch.cardId === undefined ? current.card_id : patch.cardId
  const startDate = patch.startDate ?? current.start_date
  const endDate = patch.endDate === undefined ? current.end_date : patch.endDate
  await assertExpenseCategory(userId, categoryId)
  // Permite editar/desativar uma regra histórica que aponta para cartão
  // posteriormente inativado, mas não trocar/criar um vínculo inativo.
  if (patch.cardId !== undefined && patch.cardId !== null && patch.cardId !== current.card_id) await assertUsableCard(userId, cardId)
  assertDates(startDate, endDate)
  const row = await recurringExpenseRepository.update(userId, id, patch)
  // Ocorrências existentes nunca são atualizadas; só preenche competências ainda ausentes.
  await ensureRecurringExpensesGenerated(userId)
  return mapRecurringExpenseRow(row)
}
async function getRecurringExpenseDeletionPreview(userId, id) {
  await findExistingOrThrow(userId, id)
  const preview = await recurringExpenseRepository.deletionPreview(userId, id)
  return {
    id: preview.recurring.id,
    description: preview.recurring.description,
    transactionCount: Number(preview.impact.transaction_count),
    totalAmount: Number(preview.impact.total_amount),
    cardLimitImpact: Number(preview.impact.card_limit_impact),
    firstDate: preview.impact.first_date ?? null,
    lastDate: preview.impact.last_date ?? null,
  }
}

async function deleteRecurringExpense(userId, id, { mode }) {
  await findExistingOrThrow(userId, id)
  return recurringExpenseRepository.remove(userId, id, { deleteTransactions: mode === 'with-history' })
}

async function ensureRecurringExpensesGenerated(userId, { asOfDate = todayIso() } = {}) {
  assertRealDate(asOfDate, 'asOfDate')
  const throughDate = `${asOfDate.slice(0, 7)}-01`
  const rows = await recurringExpenseRepository.findActivePending(userId, throughDate)
  const plans = rows.map((row) => {
    const recurringExpense = mapRecurringExpenseRow(row)
    // Um cartão desativado não recebe novos lançamentos; os fatos já
    // gerados continuam preservados e a regra pode ser ajustada pelo usuário.
    if (recurringExpense.card && !recurringExpense.card.isActive) return null
    const nextDate = row.generated_through ? nextMonthStart(row.generated_through) : recurringExpense.startDate
    const effective = { ...recurringExpense, startDate: nextDate > recurringExpense.startDate ? nextDate : recurringExpense.startDate }
    const occurrences = buildOccurrencesThrough(effective, asOfDate).map((occurrence) => ({
      description: recurringExpense.description,
      amount: recurringExpense.amount,
      categoryId: recurringExpense.categoryId,
      notes: recurringExpense.notes,
      source: 'recurring',
      cardId: recurringExpense.card?.id ?? null,
      recurringExpenseId: recurringExpense.id,
      ...occurrence,
    }))
    return { recurringExpenseId: recurringExpense.id, throughDate, occurrences }
  }).filter(Boolean)
  return recurringExpenseRepository.reconcileOccurrences(userId, plans)
}

module.exports = { listRecurringExpenses, getRecurringExpenseById, getRecurringExpenseDeletionPreview, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, ensureRecurringExpensesGenerated }
