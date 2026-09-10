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
function findExistingOrThrow(id) {
  const row = recurringExpenseRepository.findById(id)
  if (!row) throw new NotFoundError(`Gasto recorrente ${id} não encontrado.`)
  return row
}
function assertExpenseCategory(categoryId) {
  const category = categoryRepository.findById(categoryId)
  if (!category) throw new NotFoundError(`Categoria ${categoryId} não encontrada.`)
  if (category.type !== 'expense') throw new ValidationError('Gasto recorrente exige uma categoria de despesa.', [{ field: 'categoryId', message: "categoryId exige categoria type='expense'." }])
}
function assertUsableCard(cardId) {
  if (cardId == null) return
  const card = cardRepository.findById(cardId)
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

function listRecurringExpenses(query) { return recurringExpenseRepository.findAll(query).map(mapRecurringExpenseRow) }
function getRecurringExpenseById(id) { return mapRecurringExpenseRow(findExistingOrThrow(id)) }
function createRecurringExpense(input) {
  assertExpenseCategory(input.categoryId); assertUsableCard(input.cardId); assertDates(input.startDate, input.endDate)
  const row = recurringExpenseRepository.create({ ...input, source: 'recurring' })
  ensureRecurringExpensesGenerated()
  return mapRecurringExpenseRow(recurringExpenseRepository.findById(row.id))
}
function updateRecurringExpense(id, patch) {
  const current = findExistingOrThrow(id)
  const categoryId = patch.categoryId ?? current.category_id
  const cardId = patch.cardId === undefined ? current.card_id : patch.cardId
  const startDate = patch.startDate ?? current.start_date
  const endDate = patch.endDate === undefined ? current.end_date : patch.endDate
  assertExpenseCategory(categoryId)
  // Permite editar/desativar uma regra histórica que aponta para cartão
  // posteriormente inativado, mas não trocar/criar um vínculo inativo.
  if (patch.cardId !== undefined && patch.cardId !== null && patch.cardId !== current.card_id) assertUsableCard(cardId)
  assertDates(startDate, endDate)
  const row = recurringExpenseRepository.update(id, patch)
  // Ocorrências existentes nunca são atualizadas; só preenche competências ainda ausentes.
  ensureRecurringExpensesGenerated()
  return mapRecurringExpenseRow(row)
}
// DELETE é encerramento lógico deliberadamente: preserva configuração e fatos.
function deleteRecurringExpense(id) {
  findExistingOrThrow(id)
  const row = recurringExpenseRepository.update(id, { isActive: false })
  return mapRecurringExpenseRow(row)
}

function ensureRecurringExpensesGenerated({ asOfDate = todayIso() } = {}) {
  assertRealDate(asOfDate, 'asOfDate')
  const rows = recurringExpenseRepository.findActive()
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
  const changes = recurringExpenseRepository.createOccurrences(drafts)
  return { checked: drafts.length, created: changes.reduce((total, change) => total + change, 0) }
}

module.exports = { listRecurringExpenses, getRecurringExpenseById, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, ensureRecurringExpensesGenerated }
