const recurringExpenseRepository = require('../repositories/recurringExpense.repository')
const categoryRepository = require('../repositories/category.repository')
const cardRepository = require('../repositories/card.repository')
const { mapRecurringExpenseRow } = require('../utils/mappers/recurringExpense.mapper')
const { buildOccurrencesThrough } = require('../domain/recurringExpense')
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
// DELETE é encerramento lógico deliberadamente: preserva configuração e fatos.
async function deleteRecurringExpense(userId, id) {
  await findExistingOrThrow(userId, id)
  const row = await recurringExpenseRepository.update(userId, id, { isActive: false })
  return mapRecurringExpenseRow(row)
}

async function ensureRecurringExpensesGenerated(userId, { asOfDate = todayIso() } = {}) {
  assertRealDate(asOfDate, 'asOfDate')
  const rows = await recurringExpenseRepository.findActive(userId)
  const drafts = rows.flatMap((row) => {
    const recurringExpense = mapRecurringExpenseRow(row)
    // Um cartão desativado não recebe novos lançamentos; os fatos já
    // gerados continuam preservados e a regra pode ser ajustada pelo usuário.
    if (recurringExpense.card && !recurringExpense.card.isActive) return []
    return buildOccurrencesThrough(recurringExpense, asOfDate).map((occurrence) => ({
      description: recurringExpense.description,
      amount: recurringExpense.amount,
      categoryId: recurringExpense.categoryId,
      notes: recurringExpense.notes,
      source: 'recurring',
      cardId: recurringExpense.card?.id ?? null,
      recurringExpenseId: recurringExpense.id,
      ...occurrence,
    }))
  })
  const changes = await recurringExpenseRepository.createOccurrences(userId, drafts)
  return { checked: drafts.length, created: changes.reduce((total, change) => total + change, 0) }
}

module.exports = { listRecurringExpenses, getRecurringExpenseById, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, ensureRecurringExpensesGenerated }
