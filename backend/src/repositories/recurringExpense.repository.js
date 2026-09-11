const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

const SELECT = `
  SELECT r.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, cc.name AS card_name, cc.is_active AS card_is_active
  FROM recurring_expenses r
  JOIN categories c ON c.id = r.category_id
  LEFT JOIN credit_cards cc ON cc.id = r.card_id
`

async function run(fn, errorMessage) {
  try { return await fn(getDatabase()) } catch (err) { throw new DatabaseError(errorMessage, [err.message]) }
}

function findAll(userId, { includeInactive = false } = {}) {
  return run((db) => db.prepare(`${SELECT} WHERE r.user_id = ? ${includeInactive ? '' : 'AND r.is_active = 1'} ORDER BY r.day_of_month, r.description COLLATE NOCASE`).all(userId), 'Não foi possível listar os gastos recorrentes.')
}

function findById(userId, id) {
  return run((db) => db.prepare(`${SELECT} WHERE r.id = ? AND r.user_id = ?`).get(id, userId), 'Não foi possível buscar o gasto recorrente.')
}

function findActive(userId) {
  return run((db) => db.prepare(`${SELECT} WHERE r.user_id = ? AND r.is_active = 1`).all(userId), 'Não foi possível buscar os gastos recorrentes ativos.')
}

function existsByCategoryId(userId, categoryId) {
  return run(async (db) => {
    const row = await db.prepare('SELECT EXISTS(SELECT 1 FROM recurring_expenses WHERE user_id = ? AND category_id = ?) AS used').get(userId, categoryId)
    return Boolean(row.used)
  }, 'Não foi possível verificar o uso da categoria em recorrências.')
}

function existsByCardId(userId, cardId) {
  return run(async (db) => {
    const row = await db.prepare('SELECT EXISTS(SELECT 1 FROM recurring_expenses WHERE user_id = ? AND card_id = ?) AS used').get(userId, cardId)
    return Boolean(row.used)
  }, 'Não foi possível verificar o uso do cartão em recorrências.')
}

function create(userId, data) {
  return run(async (db) => {
    const result = await db.prepare(`INSERT INTO recurring_expenses (user_id, description, amount, type, category_id, day_of_month, start_date, end_date, is_active, card_id, notes, source)
      VALUES (@userId, @description, @amount, 'expense', @categoryId, @dayOfMonth, @startDate, @endDate, @isActive, @cardId, @notes, @source)`).run({ userId, ...data, isActive: data.isActive ? 1 : 0, cardId: data.cardId ?? null, endDate: data.endDate ?? null })
    return db.prepare(`${SELECT} WHERE r.id = ? AND r.user_id = ?`).get(result.lastInsertRowid, userId)
  }, 'Não foi possível criar o gasto recorrente.')
}

const UPDATE_COLUMNS = { description: 'description', amount: 'amount', categoryId: 'category_id', dayOfMonth: 'day_of_month', startDate: 'start_date', endDate: 'end_date', isActive: 'is_active', cardId: 'card_id', notes: 'notes', source: 'source' }
function update(userId, id, patch) {
  return run(async (db) => {
    const sets = []; const params = { id, userId }
    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = key === 'isActive' ? (patch[key] ? 1 : 0) : patch[key]
    }
    sets.push("updated_at = datetime('now')")
    await db.prepare(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = @id AND user_id = @userId`).run(params)
    return db.prepare(`${SELECT} WHERE r.id = ? AND r.user_id = ?`).get(id, userId)
  }, 'Não foi possível atualizar o gasto recorrente.')
}

// INSERT OR IGNORE delega a garantia de corrida ao índice UNIQUE parcial.
function createOccurrences(userId, rows) {
  if (rows.length === 0) return []
  return run((db) => db.transaction(async (tx) => {
    const insert = tx.prepare(`INSERT OR IGNORE INTO transactions (
      user_id, description, amount, type, category_id, date, competence_month, competence_year, notes, source,
      is_recurring, is_fixed, card, card_id, installment_current, installment_total, installment_group_id,
      tags, status, recurring_expense_id
    ) VALUES (@userId, @description, @amount, 'expense', @categoryId, @date, @competenceMonth, @competenceYear, @notes, @source,
      1, 0, NULL, @cardId, NULL, NULL, NULL, '[]', 'confirmed', @recurringExpenseId)`)
    const changes = []
    for (const item of rows) changes.push((await insert.run({ userId, ...item })).changes)
    return changes
  }), 'Não foi possível gerar as ocorrências recorrentes.')
}

module.exports = { findAll, findById, findActive, existsByCategoryId, existsByCardId, create, update, createOccurrences }
