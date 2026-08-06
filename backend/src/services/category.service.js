const categoryRepository = require('../repositories/category.repository')
const transactionRepository = require('../repositories/transaction.repository')
const { mapCategoryRow } = require('../utils/mappers/category.mapper')
const NotFoundError = require('../errors/NotFoundError')
const ConflictError = require('../errors/ConflictError')
const ERROR_CODES = require('../constants/errorCodes')

function findExistingOrThrow(id) {
  const row = categoryRepository.findById(id)
  if (!row) throw new NotFoundError(`Categoria ${id} não encontrada.`)
  return row
}

function assertNotDuplicate(type, name, { excludeId } = {}) {
  const existing = categoryRepository.findByTypeAndName(type, name, { excludeId })
  if (existing) {
    throw new ConflictError(
      `Já existe uma categoria de ${type === 'income' ? 'receita' : 'despesa'} chamada "${name}".`,
      [],
      ERROR_CODES.DUPLICATE_CATEGORY
    )
  }
}

function listCategories({ type, includeInactive }) {
  return categoryRepository.findAll({ type, includeInactive }).map(mapCategoryRow)
}

function getCategoryById(id) {
  return mapCategoryRow(findExistingOrThrow(id))
}

function createCategory(input) {
  assertNotDuplicate(input.type, input.name)
  const row = categoryRepository.create(input)
  return mapCategoryRow(row)
}

function updateCategory(id, patch) {
  const current = findExistingOrThrow(id)

  const effectiveType = patch.type ?? current.type
  const effectiveName = patch.name ?? current.name
  if (patch.type !== undefined || patch.name !== undefined) {
    assertNotDuplicate(effectiveType, effectiveName, { excludeId: id })
  }

  const row = categoryRepository.update(id, patch)
  return mapCategoryRow(row)
}

// Regra de negócio: uma categoria referenciada por transações não pode ser
// removida de verdade (a FK ON DELETE RESTRICT recusaria de qualquer jeito),
// então vira uma desativação lógica. Sem transações associadas, remove de
// fato.
function deleteCategory(id) {
  findExistingOrThrow(id)

  const isUsed = transactionRepository.existsByCategoryId(id)

  if (isUsed) {
    const row = categoryRepository.setActive(id, false)
    return { category: mapCategoryRow(row), softDeleted: true }
  }

  categoryRepository.remove(id)
  return { category: null, softDeleted: false }
}

module.exports = { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory }
