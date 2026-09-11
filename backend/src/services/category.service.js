const categoryRepository = require('../repositories/category.repository')
const transactionRepository = require('../repositories/transaction.repository')
const recurringExpenseRepository = require('../repositories/recurringExpense.repository')
const { mapCategoryRow } = require('../utils/mappers/category.mapper')
const NotFoundError = require('../errors/NotFoundError')
const ConflictError = require('../errors/ConflictError')
const ERROR_CODES = require('../constants/errorCodes')

async function findExistingOrThrow(userId, id) {
  const row = await categoryRepository.findById(userId, id)
  if (!row) throw new NotFoundError(`Categoria ${id} não encontrada.`)
  return row
}

async function assertNotDuplicate(userId, type, name, { excludeId } = {}) {
  const existing = await categoryRepository.findByTypeAndName(userId, type, name, { excludeId })
  if (existing) {
    throw new ConflictError(
      `Já existe uma categoria de ${type === 'income' ? 'receita' : 'despesa'} chamada "${name}".`,
      [],
      ERROR_CODES.DUPLICATE_CATEGORY
    )
  }
}

async function listCategories(userId, { type, includeInactive }) {
  return (await categoryRepository.findAll(userId, { type, includeInactive })).map(mapCategoryRow)
}

async function getCategoryById(userId, id) {
  return mapCategoryRow(await findExistingOrThrow(userId, id))
}

async function createCategory(userId, input) {
  await assertNotDuplicate(userId, input.type, input.name)
  const row = await categoryRepository.create(userId, input)
  return mapCategoryRow(row)
}

async function updateCategory(userId, id, patch) {
  const current = await findExistingOrThrow(userId, id)

  const effectiveType = patch.type ?? current.type
  const effectiveName = patch.name ?? current.name
  if (patch.type !== undefined || patch.name !== undefined) {
    await assertNotDuplicate(userId, effectiveType, effectiveName, { excludeId: id })
  }

  const row = await categoryRepository.update(userId, id, patch)
  return mapCategoryRow(row)
}

// DELETE significa exclusão física. A FK protege o histórico: uma categoria
// em uso não é escondida/desativada silenciosamente, a operação é recusada.
async function deleteCategory(userId, id) {
  await findExistingOrThrow(userId, id)

  const isUsed = (await transactionRepository.existsByCategoryId(userId, id)) || (await recurringExpenseRepository.existsByCategoryId(userId, id))

  if (isUsed) {
    throw new ConflictError('Não é possível excluir uma categoria que possui transações ou recorrências. Exclua, recategorize ou ajuste os registros vinculados primeiro.')
  }

  await categoryRepository.remove(userId, id)
  return { category: null }
}

module.exports = { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory }
