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

function findActivePending(userId, throughDate) {
  return run((db) => db.prepare(`${SELECT}
    WHERE r.user_id = ? AND r.is_active = 1
      AND (r.generated_through IS NULL OR r.generated_through < ?)`)
    .all(userId, throughDate), 'Não foi possível buscar os gastos recorrentes pendentes.')
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

function deletionPreview(userId, id) {
  return run(async (db) => {
    const recurring = await db.prepare('SELECT id, description FROM recurring_expenses WHERE id = ? AND user_id = ?').get(id, userId)
    if (!recurring) return null
    const impact = await db.prepare(`
      SELECT COUNT(*) AS transaction_count,
             COALESCE(SUM(amount), 0) AS total_amount,
             COALESCE(SUM(CASE WHEN card_id IS NOT NULL AND status != 'cancelled' THEN amount ELSE 0 END), 0) AS card_limit_impact,
             MIN(date) AS first_date, MAX(date) AS last_date
      FROM transactions WHERE user_id = ? AND recurring_expense_id = ?
    `).get(userId, id)
    return { recurring, impact }
  }, 'Não foi possível calcular o impacto da exclusão.')
}

function remove(userId, id, { deleteTransactions }) {
  return run((db) => db.transaction(async (tx) => {
    const impact = await tx.prepare('SELECT COUNT(*) AS count FROM transactions WHERE user_id = ? AND recurring_expense_id = ?').get(userId, id)
    if (deleteTransactions) {
      await tx.prepare('DELETE FROM transactions WHERE user_id = ? AND recurring_expense_id = ?').run(userId, id)
    } else {
      await tx.prepare("UPDATE transactions SET recurring_expense_id = NULL, updated_at = datetime('now') WHERE user_id = ? AND recurring_expense_id = ?").run(userId, id)
    }
    await tx.prepare('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?').run(id, userId)
    await tx.prepare("UPDATE google_sheets_integrations SET requires_full_export = 1, updated_at = datetime('now') WHERE user_id = ?").run(userId)
    return { deletedTransactions: deleteTransactions ? Number(impact.count) : 0, preservedTransactions: deleteTransactions ? 0 : Number(impact.count) }
  }), 'Não foi possível excluir o gasto recorrente.')
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
    if (patch.startDate !== undefined || patch.endDate !== undefined) sets.push('generated_through = NULL')
    sets.push("updated_at = datetime('now')")
    await db.prepare(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = @id AND user_id = @userId`).run(params)
    return db.prepare(`${SELECT} WHERE r.id = ? AND r.user_id = ?`).get(id, userId)
  }, 'Não foi possível atualizar o gasto recorrente.')
}

// Todo o lote vai em uma única chamada transacional ao libSQL/Turso. O
// checkpoint só avança no mesmo batch dos INSERTs, portanto uma falha não
// pode deixar a recorrência marcada como conciliada sem os seus registros.
function reconcileOccurrences(userId, plans) {
  if (plans.length === 0) return { checked: 0, created: 0 }
  return run(async (db) => {
    const statements = []
    const insertIndexes = new Set()
    for (const plan of plans) {
      for (const item of plan.occurrences) {
        insertIndexes.add(statements.length)
        statements.push({ sql: `INSERT OR IGNORE INTO transactions (
      user_id, description, amount, type, category_id, date, competence_month, competence_year, notes, source,
      is_recurring, is_fixed, card, card_id, installment_current, installment_total, installment_group_id,
      tags, status, recurring_expense_id
    ) VALUES (@userId, @description, @amount, 'expense', @categoryId, @date, @competenceMonth, @competenceYear, @notes, @source,
      1, 0, NULL, @cardId, NULL, NULL, NULL, '[]', 'confirmed', @recurringExpenseId)`, args: { userId, ...item } })
      }
      statements.push({
        sql: `UPDATE recurring_expenses
              SET generated_through = CASE
                WHEN generated_through IS NULL OR generated_through < @throughDate THEN @throughDate
                ELSE generated_through END,
                updated_at = datetime('now')
              WHERE id = @recurringExpenseId AND user_id = @userId`,
        args: { userId, recurringExpenseId: plan.recurringExpenseId, throughDate: plan.throughDate },
      })
    }
    const results = await db.batch(statements, 'write')
    let created = 0
    results.forEach((result, index) => { if (insertIndexes.has(index)) created += Number(result.rowsAffected || 0) })
    return { checked: insertIndexes.size, created }
  }, 'Não foi possível gerar as ocorrências recorrentes.')
}

module.exports = { findAll, findById, findActivePending, existsByCategoryId, existsByCardId, deletionPreview, remove, create, update, reconcileOccurrences }
