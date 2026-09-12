import { buildInstallmentPlan, monthStart, occurrenceDate, roundCurrency } from './domain.js'
import { createDemoStorage } from './storage.js'

export class DemoApiError extends Error {
  constructor(message, { status = 400, code = 'DEMO_VALIDATION_ERROR', details = [] } = {}) {
    super(message)
    this.name = 'DemoApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const success = (data = null, message = '', meta) => ({ success: true, data, message, ...(meta ? { meta } : {}) })
const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19)
const clone = (value) => JSON.parse(JSON.stringify(value))
const normalizeName = (value) => value.trim().toLocaleLowerCase('pt-BR')

function nextId(state, entity) {
  const id = state.nextIds[entity]
  state.nextIds[entity] += 1
  return id
}

function requireItem(items, id, entity) {
  const item = items.find((candidate) => candidate.id === Number(id))
  if (!item) throw new DemoApiError(`${entity} não encontrado.`, { status: 404, code: 'NOT_FOUND' })
  return item
}

function categoryView(category) {
  return category ? clone(category) : undefined
}

function transactionView(state, item) {
  const category = state.categories.find((candidate) => candidate.id === item.categoryId)
  const card = state.cards.find((candidate) => candidate.id === item.cardId)
  return {
    ...clone(item),
    category: categoryView(category),
    card: card ? { id: card.id, name: card.name } : null,
  }
}

function recurringView(state, item) {
  const category = state.categories.find((candidate) => candidate.id === item.categoryId)
  const card = state.cards.find((candidate) => candidate.id === item.cardId)
  const { generatedThrough: _generatedThrough, cardId: _cardId, ...publicItem } = item
  return {
    ...clone(publicItem),
    category: category ? { id: category.id, name: category.name, color: category.color, icon: category.icon } : undefined,
    card: card ? { id: card.id, name: card.name, isActive: card.isActive } : null,
  }
}

function assertCategory(state, categoryId, type) {
  const category = requireItem(state.categories, categoryId, 'Categoria')
  if (category.type !== type) throw new DemoApiError('A categoria selecionada não corresponde ao tipo da movimentação.')
  return category
}

function assertCard(state, cardId) {
  if (cardId == null) return null
  const card = requireItem(state.cards, cardId, 'Cartão')
  if (!card.isActive) throw new DemoApiError(`O cartão "${card.name}" está inativo.`)
  return card
}

function baseTransaction(state, input) {
  const [year, month] = input.date.split('-').map(Number)
  const now = timestamp()
  return {
    id: nextId(state, 'transaction'),
    description: input.description || '',
    amount: roundCurrency(input.amount),
    type: input.type,
    categoryId: Number(input.categoryId),
    date: input.date,
    competence: input.competenceMonth && input.competenceYear
      ? { month: Number(input.competenceMonth), year: Number(input.competenceYear) }
      : { month, year },
    notes: input.notes || '',
    source: input.source || 'manual',
    isRecurring: Boolean(input.isRecurring),
    recurringExpenseId: input.recurringExpenseId ?? null,
    isFixed: Boolean(input.isFixed),
    cardId: input.cardId == null ? null : Number(input.cardId),
    installments: input.installments ?? null,
    tags: input.tags || [],
    status: input.status || 'confirmed',
    createdAt: now,
    updatedAt: now,
  }
}

function nextMonth(monthStartValue) {
  const [year, month] = monthStartValue.split('-').map(Number)
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function ensureRecurringThrough(state, asOfDate) {
  const targetMonth = monthStart(asOfDate)
  for (const recurring of state.recurringExpenses) {
    if (!recurring.isActive || recurring.startDate > `${targetMonth.slice(0, 7)}-31`) continue
    const card = recurring.cardId == null ? null : state.cards.find((item) => item.id === recurring.cardId)
    if (card && !card.isActive) continue

    let cursor = recurring.generatedThrough
      ? nextMonth(recurring.generatedThrough)
      : monthStart(recurring.startDate)
    const endMonth = recurring.endDate ? monthStart(recurring.endDate) : null

    while (cursor <= targetMonth && (!endMonth || cursor <= endMonth)) {
      const [year, month] = cursor.split('-').map(Number)
      const date = occurrenceDate(year, month, recurring.dayOfMonth)
      if (date >= recurring.startDate && (!recurring.endDate || date <= recurring.endDate)) {
        const exists = state.transactions.some((item) => item.recurringExpenseId === recurring.id && item.date === date)
        if (!exists) {
          state.transactions.push(baseTransaction(state, {
            description: recurring.description,
            amount: recurring.amount,
            type: 'expense',
            categoryId: recurring.categoryId,
            date,
            notes: recurring.notes,
            source: 'recurring',
            isRecurring: true,
            recurringExpenseId: recurring.id,
            cardId: recurring.cardId,
          }))
        }
      }
      cursor = nextMonth(cursor)
    }
    recurring.generatedThrough = endMonth && targetMonth > endMonth ? endMonth : targetMonth
  }
}

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function resolveGenerationDate(query) {
  if (query.get('dateTo')) return query.get('dateTo')
  if (query.get('year') && query.get('month')) {
    const year = Number(query.get('year'))
    const month = Number(query.get('month'))
    return occurrenceDate(year, month, 31)
  }
  return localDate()
}

function listTransactions(state, query) {
  ensureRecurringThrough(state, resolveGenerationDate(query))
  let items = state.transactions.map((item) => transactionView(state, item))
  const search = query.get('q')?.trim().toLocaleLowerCase('pt-BR')
  const type = query.get('type')
  const categoryId = query.get('categoryId')
  const cardId = query.get('cardId')
  const month = query.get('month')
  const year = query.get('year')
  const dateFrom = query.get('dateFrom')
  const dateTo = query.get('dateTo')
  const status = query.get('status')

  if (search) items = items.filter((item) => `${item.description} ${item.category?.name || ''} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(search))
  if (type) items = items.filter((item) => item.type === type)
  if (categoryId) items = items.filter((item) => item.categoryId === Number(categoryId))
  if (cardId) items = items.filter((item) => item.card?.id === Number(cardId))
  if (month) items = items.filter((item) => item.competence.month === Number(month))
  if (year) items = items.filter((item) => item.competence.year === Number(year))
  if (dateFrom) items = items.filter((item) => item.date >= dateFrom)
  if (dateTo) items = items.filter((item) => item.date <= dateTo)
  if (status) items = items.filter((item) => item.status === status)

  const sortBy = query.get('sortBy') || 'date'
  const direction = query.get('sortDir') === 'asc' ? 1 : -1
  items.sort((left, right) => {
    const leftValue = sortBy === 'category' ? left.category?.name : sortBy === 'createdAt' ? left.createdAt : left[sortBy]
    const rightValue = sortBy === 'category' ? right.category?.name : sortBy === 'createdAt' ? right.createdAt : right[sortBy]
    if (typeof leftValue === 'number') return (leftValue - rightValue) * direction
    return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'pt-BR') * direction || (right.id - left.id)
  })

  const page = Math.max(1, Number(query.get('page') || 1))
  const limit = Math.max(1, Number(query.get('limit') || 20))
  const total = items.length
  const data = items.slice((page - 1) * limit, page * limit)
  return success(data, '', { page, limit, total, totalPages: Math.ceil(total / limit) })
}

function createTransaction(state, input) {
  if (!(Number(input.amount) > 0)) throw new DemoApiError('O valor deve ser maior que zero.')
  assertCategory(state, input.categoryId, input.type)
  const card = input.cardId == null ? null : assertCard(state, input.cardId)
  if (card && input.type !== 'expense') throw new DemoApiError('Cartão só pode ser associado a uma despesa.')

  if (card && Number(input.installmentTotal) > 1) {
    const groupId = globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}`
    const plan = buildInstallmentPlan({
      totalAmount: Number(input.amount),
      installmentsCount: Number(input.installmentTotal),
      purchaseDate: input.date,
      description: input.description || '',
      card,
    })
    const created = plan.map((installment) => baseTransaction(state, {
      ...input,
      ...installment,
      cardId: card.id,
      installments: { current: installment.installmentCurrent, total: installment.installmentTotal, groupId },
    }))
    state.transactions.push(...created)
    return success({ installmentGroupId: groupId, count: created.length, transactions: created.map((item) => transactionView(state, item)) })
  }

  const created = baseTransaction(state, input)
  state.transactions.push(created)
  return success(transactionView(state, created), 'Movimentação criada com sucesso.')
}

function updateTransaction(state, id, patch) {
  const item = requireItem(state.transactions, id, 'Movimentação')
  const effectiveType = patch.type ?? item.type
  const effectiveCategory = patch.categoryId ?? item.categoryId
  assertCategory(state, effectiveCategory, effectiveType)
  if (patch.cardId != null) {
    assertCard(state, patch.cardId)
    if (effectiveType !== 'expense') throw new DemoApiError('Cartão só pode ser associado a uma despesa.')
  }
  Object.assign(item, clone(patch), {
    categoryId: Number(effectiveCategory),
    cardId: patch.cardId === undefined ? item.cardId : patch.cardId == null ? null : Number(patch.cardId),
    amount: patch.amount === undefined ? item.amount : roundCurrency(patch.amount),
    updatedAt: timestamp(),
  })
  if (patch.date && patch.competenceMonth === undefined && patch.competenceYear === undefined) {
    const [year, month] = patch.date.split('-').map(Number)
    item.competence = { month, year }
  }
  return success(transactionView(state, item), 'Movimentação atualizada com sucesso.')
}

function transactionDeletionPreview(state, id) {
  const item = requireItem(state.transactions, id, 'Movimentação')
  const groupSize = item.installments?.groupId
    ? state.transactions.filter((candidate) => candidate.installments?.groupId === item.installments.groupId).length
    : 1
  return success({
    id: item.id,
    description: item.description,
    amount: item.amount,
    type: item.type,
    permanent: true,
    isRecurringOccurrence: item.recurringExpenseId != null,
    cardLimitReduction: item.cardId != null && item.status !== 'cancelled' ? item.amount : 0,
    installmentGroupSize: groupSize,
    deletesOnlyThisInstallment: groupSize > 1,
  })
}

function cardSummary(state, id) {
  ensureRecurringThrough(state, localDate())
  const card = requireItem(state.cards, id, 'Cartão')
  const purchasesTotal = roundCurrency(state.transactions
    .filter((item) => item.cardId === card.id && item.type === 'expense' && item.status !== 'cancelled')
    .reduce((sum, item) => sum + item.amount, 0))
  const paidAmount = roundCurrency(state.cardPayments
    .filter((item) => item.cardId === card.id)
    .reduce((sum, item) => sum + item.amount, 0))
  const usedLimit = Math.max(0, roundCurrency(purchasesTotal - paidAmount))
  return {
    ...clone(card),
    purchasesTotal,
    paidAmount,
    usedLimit,
    availableLimit: roundCurrency(card.creditLimit - usedLimit),
  }
}

function createCategory(state, input) {
  const duplicate = state.categories.some((item) => item.type === input.type && normalizeName(item.name) === normalizeName(input.name))
  if (duplicate) throw new DemoApiError(`Já existe uma categoria chamada "${input.name}".`, { status: 409, code: 'CONFLICT' })
  const now = timestamp()
  const created = {
    id: nextId(state, 'category'),
    name: input.name.trim(), type: input.type, color: input.color, icon: input.icon,
    isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0, createdAt: now, updatedAt: now,
  }
  state.categories.push(created)
  return success(clone(created), 'Categoria criada com sucesso.')
}

function updateCategory(state, id, patch) {
  const item = requireItem(state.categories, id, 'Categoria')
  const name = patch.name ?? item.name
  const type = patch.type ?? item.type
  const duplicate = state.categories.some((candidate) => candidate.id !== item.id && candidate.type === type && normalizeName(candidate.name) === normalizeName(name))
  if (duplicate) throw new DemoApiError(`Já existe uma categoria chamada "${name}".`, { status: 409, code: 'CONFLICT' })
  Object.assign(item, clone(patch), { name: name.trim(), type, updatedAt: timestamp() })
  return success(clone(item), 'Categoria atualizada com sucesso.')
}

function categoryPreview(state, id) {
  const category = requireItem(state.categories, id, 'Categoria')
  const transactions = state.transactions.filter((item) => item.categoryId === category.id).length
  const recurringExpenses = state.recurringExpenses.filter((item) => item.categoryId === category.id).length
  return success({ category: clone(category), transactions, recurringExpenses, canDelete: transactions === 0 && recurringExpenses === 0 })
}

function createCard(state, input) {
  if (state.cards.some((item) => normalizeName(item.name) === normalizeName(input.name))) {
    throw new DemoApiError(`Já existe um cartão chamado "${input.name}".`, { status: 409, code: 'CONFLICT' })
  }
  const now = timestamp()
  const created = {
    id: nextId(state, 'card'), name: input.name.trim(), creditLimit: roundCurrency(input.creditLimit),
    closingDay: Number(input.closingDay), dueDay: Number(input.dueDay), isActive: input.isActive ?? true,
    createdAt: now, updatedAt: now,
  }
  state.cards.push(created)
  return success(clone(created), 'Cartão criado com sucesso.')
}

function updateCard(state, id, patch) {
  const item = requireItem(state.cards, id, 'Cartão')
  const name = patch.name ?? item.name
  if (state.cards.some((candidate) => candidate.id !== item.id && normalizeName(candidate.name) === normalizeName(name))) {
    throw new DemoApiError(`Já existe um cartão chamado "${name}".`, { status: 409, code: 'CONFLICT' })
  }
  Object.assign(item, clone(patch), {
    name: name.trim(),
    creditLimit: patch.creditLimit === undefined ? item.creditLimit : roundCurrency(patch.creditLimit),
    closingDay: patch.closingDay === undefined ? item.closingDay : Number(patch.closingDay),
    dueDay: patch.dueDay === undefined ? item.dueDay : Number(patch.dueDay),
    updatedAt: timestamp(),
  })
  return success(clone(item), 'Cartão atualizado com sucesso.')
}

function cardPreview(state, id) {
  const card = requireItem(state.cards, id, 'Cartão')
  const transactions = state.transactions.filter((item) => item.cardId === card.id).length
  const recurringExpenses = state.recurringExpenses.filter((item) => item.cardId === card.id).length
  const payments = state.cardPayments.filter((item) => item.cardId === card.id).length
  return success({ card: clone(card), transactions, recurringExpenses, payments, purchasesTotal: cardSummary(state, id).purchasesTotal, canDelete: transactions === 0 && recurringExpenses === 0 && payments === 0 })
}

function registerCardPayment(state, id, input) {
  const card = requireItem(state.cards, id, 'Cartão')
  const before = cardSummary(state, card.id)
  const amount = roundCurrency(input.amount)
  if (!(amount > 0) || amount > before.usedLimit) throw new DemoApiError(`O pagamento não pode exceder o limite atualmente utilizado (${before.usedLimit}).`)
  const payment = { id: nextId(state, 'cardPayment'), cardId: card.id, amount, paidAt: input.paidAt, notes: input.notes || '', createdAt: timestamp() }
  state.cardPayments.push(payment)
  return success({ payment: clone(payment), summary: cardSummary(state, card.id) }, 'Pagamento registrado com sucesso.')
}

function createRecurring(state, input) {
  assertCategory(state, input.categoryId, 'expense')
  assertCard(state, input.cardId)
  const now = timestamp()
  const created = {
    id: nextId(state, 'recurringExpense'), description: input.description.trim(), amount: roundCurrency(input.amount),
    type: 'expense', categoryId: Number(input.categoryId), dayOfMonth: Number(input.dayOfMonth),
    startDate: input.startDate, endDate: input.endDate || null, isActive: input.isActive ?? true,
    cardId: input.cardId == null ? null : Number(input.cardId), notes: input.notes || '', source: 'recurring',
    generatedThrough: null, createdAt: now, updatedAt: now,
  }
  state.recurringExpenses.push(created)
  ensureRecurringThrough(state, localDate())
  return success(recurringView(state, created), 'Gasto recorrente criado com sucesso.')
}

function updateRecurring(state, id, patch) {
  const item = requireItem(state.recurringExpenses, id, 'Gasto recorrente')
  const categoryId = patch.categoryId ?? item.categoryId
  assertCategory(state, categoryId, 'expense')
  if (patch.cardId != null && patch.cardId !== item.cardId) assertCard(state, patch.cardId)
  Object.assign(item, clone(patch), {
    categoryId: Number(categoryId),
    cardId: patch.cardId === undefined ? item.cardId : patch.cardId == null ? null : Number(patch.cardId),
    amount: patch.amount === undefined ? item.amount : roundCurrency(patch.amount),
    dayOfMonth: patch.dayOfMonth === undefined ? item.dayOfMonth : Number(patch.dayOfMonth),
    updatedAt: timestamp(),
  })
  ensureRecurringThrough(state, localDate())
  return success(recurringView(state, item), 'Gasto recorrente atualizado com sucesso.')
}

function recurringPreview(state, id) {
  const item = requireItem(state.recurringExpenses, id, 'Gasto recorrente')
  const transactions = state.transactions.filter((candidate) => candidate.recurringExpenseId === item.id)
  return success({
    id: item.id, description: item.description, transactionCount: transactions.length,
    totalAmount: roundCurrency(transactions.reduce((sum, candidate) => sum + candidate.amount, 0)),
    cardLimitImpact: roundCurrency(transactions.filter((candidate) => candidate.cardId && candidate.status !== 'cancelled').reduce((sum, candidate) => sum + candidate.amount, 0)),
    firstDate: transactions.map((candidate) => candidate.date).sort()[0] || null,
    lastDate: transactions.map((candidate) => candidate.date).sort().at(-1) || null,
  })
}

function dataPreview(state, operation) {
  const allCounts = {
    transactions: state.transactions.length,
    recurringExpenses: state.recurringExpenses.length,
    categories: state.categories.length,
    cards: state.cards.length,
    cardPayments: state.cardPayments.length,
    sheetImports: 0,
    syncRuns: 0,
  }
  const affected = operation === 'clear-records'
    ? ['transactions', 'cardPayments', 'sheetImports', 'syncRuns']
    : Object.keys(allCounts)
  const counts = Object.fromEntries(affected.map((key) => [key, allCounts[key]]))
  return success({
    operation, counts, totalRecords: Object.values(counts).reduce((sum, value) => sum + value, 0),
    preservesAccount: true, preservesSettings: true, preservesStructure: operation === 'clear-records',
    spreadsheetWillBeOverwritten: false,
    confirmationPhrase: operation === 'clear-records' ? 'LIMPAR REGISTROS' : 'RESETAR COFRE',
  })
}

function dispatch(state, method, rawPath, body) {
  const url = new URL(rawPath, 'https://cofre-demo.local')
  const path = url.pathname

  if (method === 'GET' && path === '/auth/me') return success({ authenticated: true, user: clone(state.user) })
  if (method === 'POST' && path === '/auth/logout') return success({ authenticated: true, user: clone(state.user) }, 'A sessão fictícia permanece ativa no modo demonstração.')

  if (path === '/settings') {
    if (method === 'GET') return success(clone(state.settings))
    if (method === 'PATCH') {
      if (body.theme && !['system', 'light', 'dark'].includes(body.theme)) throw new DemoApiError('Tema inválido.')
      Object.assign(state.settings, clone(body), { updatedAt: timestamp() })
      return success(clone(state.settings), 'Preferências atualizadas com sucesso.')
    }
  }
  if (path === '/profile') {
    if (method === 'GET') return success(clone(state.user))
    if (method === 'PATCH') {
      if (!body.displayName?.trim()) throw new DemoApiError('O nome de exibição não pode ficar vazio.')
      state.user.displayName = body.displayName.trim()
      state.user.customDisplayName = body.displayName.trim()
      state.user.name = body.displayName.trim()
      state.user.updatedAt = timestamp()
      return success(clone(state.user), 'Perfil atualizado com sucesso.')
    }
  }

  if (path === '/categories' && method === 'GET') {
    let categories = state.categories
    if (url.searchParams.get('type')) categories = categories.filter((item) => item.type === url.searchParams.get('type'))
    if (url.searchParams.get('includeInactive') !== 'true') categories = categories.filter((item) => item.isActive)
    return success(clone(categories.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'pt-BR'))))
  }
  if (path === '/categories' && method === 'POST') return createCategory(state, body)
  let match = path.match(/^\/categories\/(\d+)\/deletion-preview$/)
  if (match && method === 'GET') return categoryPreview(state, match[1])
  match = path.match(/^\/categories\/(\d+)$/)
  if (match && method === 'PUT') return updateCategory(state, match[1], body)
  if (match && method === 'DELETE') {
    const preview = categoryPreview(state, match[1]).data
    if (!preview.canDelete) throw new DemoApiError('Não é possível excluir uma categoria que possui movimentações ou recorrências.', { status: 409, code: 'CONFLICT' })
    state.categories = state.categories.filter((item) => item.id !== Number(match[1]))
    return success({ category: null }, 'Categoria excluída definitivamente.')
  }

  if (path === '/cards' && method === 'GET') {
    const cards = url.searchParams.get('includeInactive') === 'true' ? state.cards : state.cards.filter((item) => item.isActive)
    return success(clone(cards.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))))
  }
  if (path === '/cards' && method === 'POST') return createCard(state, body)
  match = path.match(/^\/cards\/(\d+)\/deletion-preview$/)
  if (match && method === 'GET') return cardPreview(state, match[1])
  match = path.match(/^\/cards\/(\d+)\/summary$/)
  if (match && method === 'GET') return success(cardSummary(state, match[1]))
  match = path.match(/^\/cards\/(\d+)\/payments$/)
  if (match && method === 'POST') return registerCardPayment(state, match[1], body)
  match = path.match(/^\/cards\/(\d+)$/)
  if (match && method === 'PUT') return updateCard(state, match[1], body)
  if (match && method === 'DELETE') {
    const preview = cardPreview(state, match[1]).data
    if (!preview.canDelete) throw new DemoApiError('Não é possível excluir um cartão que possui registros vinculados.', { status: 409, code: 'CONFLICT' })
    state.cards = state.cards.filter((item) => item.id !== Number(match[1]))
    return success({ card: null }, 'Cartão excluído definitivamente.')
  }

  if (path === '/recurring-expenses' && method === 'GET') {
    const recurring = url.searchParams.get('includeInactive') === 'true'
      ? state.recurringExpenses
      : state.recurringExpenses.filter((item) => item.isActive)
    return success(recurring.map((item) => recurringView(state, item)))
  }
  if (path === '/recurring-expenses' && method === 'POST') return createRecurring(state, body)
  match = path.match(/^\/recurring-expenses\/(\d+)\/deletion-preview$/)
  if (match && method === 'GET') return recurringPreview(state, match[1])
  match = path.match(/^\/recurring-expenses\/(\d+)$/)
  if (match && method === 'PUT') return updateRecurring(state, match[1], body)
  if (match && method === 'DELETE') {
    const id = Number(match[1])
    requireItem(state.recurringExpenses, id, 'Gasto recorrente')
    const related = state.transactions.filter((item) => item.recurringExpenseId === id)
    if (body.mode === 'with-history') state.transactions = state.transactions.filter((item) => item.recurringExpenseId !== id)
    else state.transactions.forEach((item) => { if (item.recurringExpenseId === id) { item.recurringExpenseId = null; item.isRecurring = false } })
    state.recurringExpenses = state.recurringExpenses.filter((item) => item.id !== id)
    return success({ deletedTransactions: body.mode === 'with-history' ? related.length : 0, preservedTransactions: body.mode === 'preserve-history' ? related.length : 0 }, 'Gasto recorrente excluído.')
  }

  if (path === '/transactions' && method === 'GET') return listTransactions(state, url.searchParams)
  if (path === '/transactions' && method === 'POST') return createTransaction(state, body)
  match = path.match(/^\/transactions\/(\d+)\/deletion-preview$/)
  if (match && method === 'GET') return transactionDeletionPreview(state, match[1])
  match = path.match(/^\/transactions\/(\d+)$/)
  if (match && method === 'PUT') return updateTransaction(state, match[1], body)
  if (match && method === 'DELETE') {
    requireItem(state.transactions, match[1], 'Movimentação')
    state.transactions = state.transactions.filter((item) => item.id !== Number(match[1]))
    return success(null, 'Movimentação excluída definitivamente.')
  }

  if (path === '/data-management/preview' && method === 'GET') return dataPreview(state, url.searchParams.get('operation'))
  if (path === '/data-management/clear-records' && method === 'POST') {
    if (body.confirmation !== 'LIMPAR REGISTROS') throw new DemoApiError('Confirmação inválida.')
    const deleted = { transactions: state.transactions.length, cardPayments: state.cardPayments.length, sheetImports: 0, syncRuns: 0 }
    state.transactions = []
    state.cardPayments = []
    const currentMonth = monthStart(localDate())
    state.recurringExpenses.forEach((item) => { item.generatedThrough = currentMonth })
    return success({ deleted, spreadsheetRequiresExport: false }, 'Registros financeiros removidos.')
  }
  if (path === '/data-management/reset' && method === 'POST') {
    if (body.confirmation !== 'RESETAR COFRE') throw new DemoApiError('Confirmação inválida.')
    state.transactions = []
    state.cardPayments = []
    state.recurringExpenses = []
    state.categories = []
    state.cards = []
    return success(null, 'Dados do Cofre removidos.')
  }

  if (path.startsWith('/integrations/google-sheets')) {
    if (method === 'GET' && path.endsWith('/sync/history')) return success([])
    if (method === 'GET' && path.endsWith('/sync')) return success({ ready: false, latest: null })
    if (method === 'GET') return success({ status: 'not_connected', demoDisabled: true })
    throw new DemoApiError('A integração Google Sheets está desativada na demonstração pública.', { status: 403, code: 'DEMO_EXTERNAL_INTEGRATION_DISABLED' })
  }

  throw new DemoApiError(`Operação não disponível na demonstração: ${method} ${path}`, { status: 404, code: 'DEMO_ROUTE_NOT_FOUND' })
}

export function createDemoApiClient(storageLike) {
  const storage = createDemoStorage(storageLike)
  const request = async (method, path, body) => {
    if (method === 'POST' && path === '/demo/reset') {
      storage.reset()
      return success(null, 'Demonstração restaurada com os dados originais.')
    }
    return clone(storage.update((state) => dispatch(state, method, path, body || {})))
  }

  return {
    url: () => { throw new DemoApiError('Navegação para serviços externos bloqueada no modo demonstração.', { status: 403 }) },
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path, body) => request('DELETE', path, body),
  }
}
