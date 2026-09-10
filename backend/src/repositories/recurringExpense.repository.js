const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

const SELECT = `
  SELECT r.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, cc.name AS card_name, cc.is_active AS card_is_active
  FROM recurring_expenses r
  JOIN categories c ON c.id = r.category_id
  LEFT JOIN credit_cards cc ON cc.id = r.card_id
`

function run(fn, errorMessage) {
  try { return fn(getDatabase()) } catch (err) { throw new DatabaseError(errorMessage, [err.message]) }
}

function findAll({ includeInactive = false } = {}) {
  return run((db) => db.prepare(`${SELECT} ${includeInactive ? '' : 'WHERE r.is_active = 1'} ORDER BY r.day_of_month, r.description COLLATE NOCASE`).all(), 'Não foi possível listar os gastos recorrentes.')
}

function findById(id) {
  return run((db) => db.prepare(`${SELECT} WHERE r.id = ?`).get(id), 'Não foi possível buscar o gasto recorrente.')
}

function findActive() {
  return run((db) => db.prepare(`${SELECT} WHERE r.is_active = 1`).all(), 'Não foi possível buscar os gastos recorrentes ativos.')
}

function create(data) {
  return run((db) => {
    const result = db.prepare(`INSERT INTO recurring_expenses (description, amount, type, category_id, day_of_month, start_date, end_date, is_active, card_id, notes, source)
      VALUES (@description, @amount, 'expense', @categoryId, @dayOfMonth, @startDate, @endDate, @isActive, @cardId, @notes, @source)`).run({ ...data, isActive: data.isActive ? 1 : 0, cardId: data.cardId ?? null, endDate: data.endDate ?? null })
    return db.prepare(`${SELECT} WHERE r.id = ?`).get(result.lastInsertRowid)
  }, 'Não foi possível criar o gasto recorrente.')
}

const UPDATE_COLUMNS = { description: 'description', amount: 'amount', categoryId: 'category_id', dayOfMonth: 'day_of_month', startDate: 'start_date', endDate: 'end_date', isActive: 'is_active', cardId: 'card_id', notes: 'notes', source: 'source' }
function update(id, patch) {
  return run((db) => {
    const sets = []; const params = { id }
    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = key === 'isActive' ? (patch[key] ? 1 : 0) : patch[key]
    }
    sets.push("updated_at = datetime('now')")
    db.prepare(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return db.prepare(`${SELECT} WHERE r.id = ?`).get(id)
  }, 'Não foi possível atualizar o gasto recorrente.')
}

// INSERT OR IGNORE delega a garantia de corrida ao índice UNIQUE parcial.
function createOccurrences(rows) {
  if (rows.length === 0) return []
  return run((db) => {
    const insert = db.prepare(`INSERT OR IGNORE INTO transactions (
      description, amount, type, category_id, date, competence_month, competence_year, notes, source,
      is_recurring, is_fixed, card, card_id, installment_current, installment_total, installment_group_id,
      tags, status, offer_amount, tithe_amount, offer_rate_applied, tithe_rate_applied, recurring_expense_id
    ) VALUES (@description, @amount, 'expense', @categoryId, @date, @competenceMonth, @competenceYear, @notes, @source,
      1, 0, NULL, @cardId, NULL, NULL, NULL, '[]', 'confirmed', 0, 0, NULL, NULL, @recurringExpenseId)`)
    const insertAll = db.transaction((items) => items.map((item) => insert.run(item).changes))
    return insertAll(rows)
  }, 'Não foi possível gerar as ocorrências recorrentes.')
}

module.exports = { findAll, findById, findActive, create, update, createOccurrences }
