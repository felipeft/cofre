const transactionRepository = require('../repositories/transaction.repository')
const categoryRepository = require('../repositories/category.repository')
const { mapTransactionRow } = require('../utils/mappers/transaction.mapper')
const { buildPaginationMeta } = require('../utils/pagination')
const { deriveCompetenceFromDate } = require('../utils/competence')
const NotFoundError = require('../errors/NotFoundError')
const ValidationError = require('../errors/ValidationError')

function findExistingOrThrow(id) {
  const row = transactionRepository.findById(id)
  if (!row) throw new NotFoundError(`Transação ${id} não encontrada.`)
  return row
}

function findCategoryOrThrow(categoryId) {
  const category = categoryRepository.findById(categoryId)
  if (!category) throw new NotFoundError(`Categoria ${categoryId} não encontrada.`)
  return category
}

// Uma transação de despesa referenciando uma categoria de receita (ou
// vice-versa) corromperia todo dashboard/análise que agrupa por categoria —
// barato de checar aqui, caro de descobrir depois.
function assertCategoryMatchesType(category, type) {
  if (category.type !== type) {
    throw new ValidationError(
      `A categoria "${category.name}" é de ${category.type === 'income' ? 'receita' : 'despesa'}, incompatível com type="${type}".`,
      [{ field: 'categoryId', message: 'Categoria não corresponde ao tipo da transação.' }]
    )
  }
}

function listTransactions(query) {
  const { page, limit, q, type, categoryId, month, year, dateFrom, dateTo, status, sortBy, sortDir } = query

  const { rows, total } = transactionRepository.findMany({
    page,
    limit,
    search: q,
    type,
    categoryId,
    month,
    year,
    dateFrom,
    dateTo,
    status,
    sortBy,
    sortDir,
  })

  return {
    data: rows.map(mapTransactionRow),
    meta: buildPaginationMeta({ page, limit, total }),
  }
}

function getTransactionById(id) {
  return mapTransactionRow(findExistingOrThrow(id))
}

function createTransaction(input) {
  const category = findCategoryOrThrow(input.categoryId)
  assertCategoryMatchesType(category, input.type)

  const competence =
    input.competenceMonth !== undefined && input.competenceYear !== undefined
      ? { competenceMonth: input.competenceMonth, competenceYear: input.competenceYear }
      : deriveCompetenceFromDate(input.date)

  const row = transactionRepository.create({
    ...input,
    ...competence,
    tags: JSON.stringify(input.tags ?? []),
  })

  return mapTransactionRow(row)
}

function updateTransaction(id, patch) {
  const current = findExistingOrThrow(id)

  const effectiveType = patch.type ?? current.type
  const effectiveCategoryId = patch.categoryId ?? current.category_id

  if (patch.type !== undefined || patch.categoryId !== undefined) {
    const category = findCategoryOrThrow(effectiveCategoryId)
    assertCategoryMatchesType(category, effectiveType)
  }

  // Se a data mudou e a competência não foi explicitamente informada nesta
  // mesma edição, a competência acompanha a nova data — do contrário uma
  // transação editada silenciosamente ficaria com competência desatualizada.
  let competencePatch = {}
  if (patch.date !== undefined && patch.competenceMonth === undefined && patch.competenceYear === undefined) {
    competencePatch = deriveCompetenceFromDate(patch.date)
  }

  const row = transactionRepository.update(id, {
    ...patch,
    ...competencePatch,
    tags: patch.tags !== undefined ? JSON.stringify(patch.tags) : undefined,
  })

  return mapTransactionRow(row)
}

function deleteTransaction(id) {
  findExistingOrThrow(id)
  transactionRepository.remove(id)
}

module.exports = { listTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction }
