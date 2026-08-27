const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

function run(fn, errorMessage) {
  try {
    return fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

// `cards` é LEFT JOIN (não JOIN) porque `card_id` é opcional — a maioria das
// transações não tem cartão nenhum associado.
const SELECT_WITH_CATEGORY = `
  SELECT
    t.*,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    c.type AS category_type,
    cc.name AS card_name
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN credit_cards cc ON cc.id = t.card_id
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

function buildWhere({ search, type, categoryId, cardId, installmentGroupId, month, year, dateFrom, dateTo, status }) {
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
  if (cardId) {
    conditions.push('t.card_id = @cardId')
    params.cardId = cardId
  }
  if (installmentGroupId) {
    conditions.push('t.installment_group_id = @installmentGroupId')
    params.installmentGroupId = installmentGroupId
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

const INSERT_COLUMNS = `
  description, amount, type, category_id, date,
  competence_month, competence_year, notes, source,
  is_recurring, is_fixed, card, card_id, installment_current, installment_total,
  installment_group_id, tags, status, offer_amount, tithe_amount, offer_rate_applied, tithe_rate_applied
`
const INSERT_PLACEHOLDERS = `
  @description, @amount, @type, @categoryId, @date,
  @competenceMonth, @competenceYear, @notes, @source,
  @isRecurring, @isFixed, @card, @cardId, @installmentCurrent, @installmentTotal,
  @installmentGroupId, @tags, @status, @offerAmount, @titheAmount, @offerRateApplied, @titheRateApplied
`

function toInsertParams(data) {
  return {
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
    cardId: data.cardId ?? null,
    installmentCurrent: data.installmentCurrent ?? null,
    installmentTotal: data.installmentTotal ?? null,
    installmentGroupId: data.installmentGroupId ?? null,
    tags: data.tags,
    status: data.status,
    offerAmount: data.offerAmount ?? 0,
    titheAmount: data.titheAmount ?? 0,
    offerRateApplied: data.offerRateApplied ?? null,
    titheRateApplied: data.titheRateApplied ?? null,
  }
}

function create(data) {
  return run((db) => {
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO transactions (${INSERT_COLUMNS}) VALUES (${INSERT_PLACEHOLDERS})`)
      .run(toInsertParams(data))

    return db.prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`).get(lastInsertRowid)
  }, 'Não foi possível criar a transação.')
}

// Cria várias transações numa única transação SQLite (BEGIN/COMMIT) — usada
// pela geração de parcelas: OU as N parcelas são criadas todas, OU nenhuma
// fica salva. `db.transaction()` do better-sqlite3 faz rollback automático
// se qualquer `insertOne.run()` lançar no meio do laço.
function createMany(dataArray) {
  return run((db) => {
    const insertOne = db.prepare(`INSERT INTO transactions (${INSERT_COLUMNS}) VALUES (${INSERT_PLACEHOLDERS})`)
    const selectOne = db.prepare(`${SELECT_WITH_CATEGORY} WHERE t.id = ?`)

    const insertAll = db.transaction((rows) => {
      return rows.map((row) => {
        const { lastInsertRowid } = insertOne.run(toInsertParams(row))
        return selectOne.get(lastInsertRowid)
      })
    })

    return insertAll(dataArray)
  }, 'Não foi possível criar as parcelas.')
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
  cardId: 'card_id',
  installmentCurrent: 'installment_current',
  installmentTotal: 'installment_total',
  installmentGroupId: 'installment_group_id',
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

// Mesma regra, para cartões: "não permitir excluir cartão utilizado em
// transações" (card.service.js).
function existsByCardId(cardId) {
  return run((db) => {
    const row = db.prepare('SELECT EXISTS(SELECT 1 FROM transactions WHERE card_id = ?) AS used').get(cardId)
    return Boolean(row.used)
  }, 'Não foi possível verificar o uso do cartão.')
}

// Todas as despesas em aberto (não canceladas) de um cartão — usado pelo
// cálculo de limite utilizado (domain/cardLimit.js). Sem paginação pelo
// mesmo motivo de `findAllForSummary`: precisa do conjunto inteiro pra somar.
function findOpenByCardId(cardId) {
  return run(
    (db) =>
      db
        .prepare(`${SELECT_WITH_CATEGORY} WHERE t.card_id = @cardId AND t.status != 'cancelled'`)
        .all({ cardId }),
    'Não foi possível calcular o limite utilizado do cartão.'
  )
}

module.exports = {
  findMany,
  findById,
  create,
  createMany,
  update,
  remove,
  existsByCategoryId,
  existsByCardId,
  findOpenByCardId,
  findAllForSummary,
}
