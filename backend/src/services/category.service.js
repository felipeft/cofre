const categoryRepository = require('../repositories/category.repository')
const transactionRepository = require('../repositories/transaction.repository')
const { mapCategoryRow } = require('../utils/mappers/category.mapper')
const NotFoundError = require('../errors/NotFoundError')
const ConflictError = require('../errors/ConflictError')
const ValidationError = require('../errors/ValidationError')
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

// Oferta e dízimo são conceitos de receita — uma categoria de despesa
// ativá-los não tem significado nenhum no domínio (não existe "dízimo do
// Mercado"). Rejeitar aqui evita salvar uma configuração sem sentido que
// silenciosamente nunca teria efeito (transaction.service só aplica a regra
// quando type === 'income').
function assertOfferTitheOnlyOnIncome(type, applyOffer, applyTithe) {
  if (type !== 'income' && (applyOffer || applyTithe)) {
    throw new ValidationError('Oferta e dízimo só podem ser configurados em categorias de receita.', [
      { field: 'type', message: "applyOffer/applyTithe exigem type='income'." },
    ])
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
  assertOfferTitheOnlyOnIncome(input.type, input.applyOffer, input.applyTithe)
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

  const effectiveApplyOffer = patch.applyOffer ?? Boolean(current.apply_offer)
  const effectiveApplyTithe = patch.applyTithe ?? Boolean(current.apply_tithe)
  assertOfferTitheOnlyOnIncome(effectiveType, effectiveApplyOffer, effectiveApplyTithe)

  const row = categoryRepository.update(id, patch)
  return mapCategoryRow(row)
}

// DELETE significa exclusão física. A FK protege o histórico: uma categoria
// em uso não é escondida/desativada silenciosamente, a operação é recusada.
function deleteCategory(id) {
  findExistingOrThrow(id)

  const isUsed = transactionRepository.existsByCategoryId(id)

  if (isUsed) {
    throw new ConflictError('Não é possível excluir uma categoria que possui transações. Exclua ou recategorize as transações vinculadas primeiro.')
  }

  categoryRepository.remove(id)
  return { category: null }
}

module.exports = { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory }
