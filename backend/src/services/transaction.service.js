const transactionRepository = require('../repositories/transaction.repository')
const categoryRepository = require('../repositories/category.repository')
const { mapTransactionRow } = require('../utils/mappers/transaction.mapper')
const { buildPaginationMeta } = require('../utils/pagination')
const { deriveCompetenceFromDate } = require('../utils/competence')
const { calculateIncomeObligations } = require('../domain/financialRules')
const { calculateFinancialSummary } = require('../domain/financialSummary')
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

// Traduz a linha da categoria (snake_case, como vem do banco) para o
// formato que o domínio de regras financeiras espera — ver
// domain/financialRules.js. Mantém o domínio isolado do formato de
// persistência, igual ao que os mappers já fazem para as respostas da API.
function toDomainCategory(categoryRow) {
  return {
    type: categoryRow.type,
    applyOffer: Boolean(categoryRow.apply_offer),
    offerRate: categoryRow.offer_rate,
    applyTithe: Boolean(categoryRow.apply_tithe),
    titheRate: categoryRow.tithe_rate,
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

  // A regra em si (domain/financialRules.js) já devolve zeros quando a
  // categoria não é de receita ou não está elegível — chamar sempre aqui
  // evita um `if (type === 'income')` espalhado pelo service.
  const obligations = calculateIncomeObligations({ amount: input.amount, category: toDomainCategory(category) })

  const row = transactionRepository.create({
    ...input,
    ...competence,
    ...obligations,
    tags: JSON.stringify(input.tags ?? []),
  })

  return mapTransactionRow(row)
}

function updateTransaction(id, patch) {
  const current = findExistingOrThrow(id)

  const effectiveType = patch.type ?? current.type
  const effectiveCategoryId = patch.categoryId ?? current.category_id

  let effectiveCategoryRow = null
  if (patch.type !== undefined || patch.categoryId !== undefined) {
    effectiveCategoryRow = findCategoryOrThrow(effectiveCategoryId)
    assertCategoryMatchesType(effectiveCategoryRow, effectiveType)
  }

  // Se a data mudou e a competência não foi explicitamente informada nesta
  // mesma edição, a competência acompanha a nova data — do contrário uma
  // transação editada silenciosamente ficaria com competência desatualizada.
  let competencePatch = {}
  if (patch.date !== undefined && patch.competenceMonth === undefined && patch.competenceYear === undefined) {
    competencePatch = deriveCompetenceFromDate(patch.date)
  }

  // Oferta/dízimo são recalculados sempre que algo que os afeta muda
  // (valor, categoria ou tipo) — e sobrescrevem os mesmos campos da mesma
  // linha, nunca criam um registro novo. É isso que garante que editar uma
  // receita de R$2.000 para R$2.500 deixe a oferta em R$25, nunca R$20 e
  // R$25 coexistindo (ver README, seção "Idempotência").
  let obligationsPatch = {}
  const amountChanged = patch.amount !== undefined
  const categoryOrTypeChanged = patch.type !== undefined || patch.categoryId !== undefined
  if (amountChanged || categoryOrTypeChanged) {
    const categoryForCalc = effectiveCategoryRow ?? categoryRepository.findById(effectiveCategoryId)
    const effectiveAmount = patch.amount ?? current.amount
    obligationsPatch = calculateIncomeObligations({ amount: effectiveAmount, category: toDomainCategory(categoryForCalc) })
  }

  const row = transactionRepository.update(id, {
    ...patch,
    ...competencePatch,
    ...obligationsPatch,
    tags: patch.tags !== undefined ? JSON.stringify(patch.tags) : undefined,
  })

  return mapTransactionRow(row)
}

function deleteTransaction(id) {
  findExistingOrThrow(id)
  transactionRepository.remove(id)
}

// Resumo financeiro de uma competência (mês/ano) — receitas, despesas,
// oferta, dízimo e saldo. A regra de como esses números se combinam vive em
// domain/financialSummary.js; aqui só busca os dados e delega o cálculo.
function getFinancialSummary({ month, year }) {
  const rows = transactionRepository.findAllForSummary({ month, year })
  const transactions = rows.map(mapTransactionRow)
  return calculateFinancialSummary(transactions)
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialSummary,
}
