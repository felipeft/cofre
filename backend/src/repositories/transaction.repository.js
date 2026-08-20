const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

function run(fn, errorMessage) {
  try {
    return fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

const SELECT_WITH_CATEGORY = `
  SELECT
    t.*,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    c.type AS category_type
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`

// Nomes de coluna nunca podem vir de input do usuário direto num ORDER BY
// (não dá pra parametrizar identificador em SQL) — por isso o valor de
// `sortBy`, já validado pelo Zod contra uma lista fixa (schemas/transaction
// schema.js), ainda passa por este whitelist antes de virar SQL.
const SORT_COLUMNS = {
  date: 't.date',
  amount: 't.amount',
  description: 't.description COLLATE NOCASE',
  category: 'c.name COLLATE NOCASE',
  createdAt: 't.created_at',
}

function buildWhere({ search, type, categoryId, month, year, dateFrom, dateTo, status }) {
  const conditions = []
  const params = {}

  if (search) {
    conditions.push('(t.description LIKE @search OR c.name LIKE @search OR t.notes LIKE @search)')
    params.search = `%${search}%`
  }
  if (type) {
    conditions.push('t.type = @type')
    params.type = type
  }
  if (categoryId) {
    conditions.push('t.category_id = @categoryId')
    params.categoryId = categoryId
  }
  if (month) {
    conditions.push('t.competence_month = @month')
    params.month = month
  }
  if (year) {
    conditions.push('t.competence_year = @year')
    params.year = year
  }
  if (dateFrom) {
    conditions.push('t.date >= @dateFrom')
    params.dateFrom = dateFrom
  }
  if (dateTo) {
    conditions.push('t.date <= @dateTo')
    params.dateTo = dateTo
  }
  if (status) {
    conditions.push('t.status = @status')
    params.status = status
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return { where, params }
}

function findMany({ page, limit, sortBy, sortDir, ...filters }) {
  return run((db) => {
    const { where, params } = buildWhere(filters)
    const orderColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.date
    const orderDirection = sortDir === 'asc' ? 'ASC' : 'DESC'
    const offset = (page - 1) * limit

    const rows = db
      .prepare(
        `${SELECT_WITH_CATEGORY}
         ${where}
         ORDER BY ${orderColumn} ${orderDirection}, t.id ${orderDirection}
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit, offset })

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM transactions t JOIN categories c ON c.id = t.category_id ${where}`)
      .get(params)

    return { rows, total }
  }, 'Não foi possível listar as transações.')
}

function findById(id) {
  return run((db) => db.prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`).get(id), 'Não foi possível buscar a transação.')
}

function create(data) {
  return run((db) => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO transactions (
           description, amount, type, category_id, date,
           competence_month, competence_year, notes, source,
           is_recurring, is_fixed, card, installment_current, installment_total,
           tags, status, offer_amount, tithe_amount, offer_rate_applied, tithe_rate_applied
         ) VALUES (
           @description, @amount, @type, @categoryId, @date,
           @competenceMonth, @competenceYear, @notes, @source,
           @isRecurring, @isFixed, @card, @installmentCurrent, @installmentTotal,
           @tags, @status, @offerAmount, @titheAmount, @offerRateApplied, @titheRateApplied
         )`
      )
      .run({
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        date: data.date,
        competenceMonth: data.competenceMonth,
        competenceYear: data.competenceYear,
        notes: data.notes,
        source: data.source,
        isRecurring: data.isRecurring ? 1 : 0,
        isFixed: data.isFixed ? 1 : 0,
        card: data.card ?? null,
        installmentCurrent: data.installmentCurrent ?? null,
        installmentTotal: data.installmentTotal ?? null,
        tags: data.tags,
        status: data.status,
        offerAmount: data.offerAmount ?? 0,
        titheAmount: data.titheAmount ?? 0,
        offerRateApplied: data.offerRateApplied ?? null,
        titheRateApplied: data.titheRateApplied ?? null,
      })

    return db.prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`).get(lastInsertRowid)
  }, 'Não foi possível criar a transação.')
}

const UPDATE_COLUMNS = {
  description: 'description',
  amount: 'amount',
  type: 'type',
  categoryId: 'category_id',
  date: 'date',
  competenceMonth: 'competence_month',
  competenceYear: 'competence_year',
  notes: 'notes',
  source: 'source',
  isRecurring: 'is_recurring',
  isFixed: 'is_fixed',
  card: 'card',
  installmentCurrent: 'installment_current',
  installmentTotal: 'installment_total',
  tags: 'tags',
  status: 'status',
  offerAmount: 'offer_amount',
  titheAmount: 'tithe_amount',
  offerRateApplied: 'offer_rate_applied',
  titheRateApplied: 'tithe_rate_applied',
}

const BOOLEAN_KEYS = new Set(['isRecurring', 'isFixed'])

function update(id, patch) {
  return run((db) => {
    const sets = []
    const params = { id }

    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = BOOLEAN_KEYS.has(key) ? (patch[key] ? 1 : 0) : patch[key]
    }

    sets.push("updated_at = datetime('now')")

    db.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return db.prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`).get(id)
  }, 'Não foi possível atualizar a transação.')
}

function remove(id) {
  return run((db) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
  }, 'Não foi possível excluir a transação.')
}

// Usado só pelo resumo financeiro (GET /transactions/summary): busca TODAS
// as transações de uma competência, sem paginação — o resumo precisa somar
// o período inteiro, não uma página dele. Separado de `findMany` para não
// forçar esse método genérico a ter um "modo sem paginação" escondido atrás
// de um parâmetro.
function findAllForSummary({ month, year }) {
  return run(
    (db) =>
      db
        .prepare(
          `${SELECT_WITH_CATEGORY} WHERE t.competence_month = @month AND t.competence_year = @year`
        )
        .all({ month, year }),
    'Não foi possível calcular o resumo financeiro.'
  )
}

// Usado pela regra de negócio de categorias: "não permitir excluir
// categoria utilizada em transações".
function existsByCategoryId(categoryId) {
  return run((db) => {
    const row = db.prepare('SELECT EXISTS(SELECT 1 FROM transactions WHERE category_id = ?) AS used').get(categoryId)
    return Boolean(row.used)
  }, 'Não foi possível verificar o uso da categoria.')
}

module.exports = { findMany, findById, create, update, remove, existsByCategoryId, findAllForSummary }
