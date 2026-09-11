const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, errorMessage) {
  try {
    return await fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

function create(userId, { name, creditLimit, closingDay, dueDay, isActive }) {
  return run(async (db) => {
    const { lastInsertRowid } = await db
      .prepare(
        `INSERT INTO credit_cards (user_id, name, credit_limit, closing_day, due_day, is_active)
         VALUES (@userId, @name, @creditLimit, @closingDay, @dueDay, @isActive)`
      )
      .run({ userId, name, creditLimit, closingDay, dueDay, isActive: isActive ? 1 : 0 })

    return db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(lastInsertRowid, userId)
  }, 'Não foi possível criar o cartão.')
}

function findAll(userId, { includeInactive = false } = {}) {
  return run(async (db) => {
    const where = includeInactive ? 'WHERE user_id = ?' : 'WHERE user_id = ? AND is_active = 1'
    return db.prepare(`SELECT * FROM credit_cards ${where} ORDER BY name COLLATE NOCASE ASC`).all(userId)
  }, 'Não foi possível listar os cartões.')
}

function findById(userId, id) {
  return run((db) => db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(id, userId), 'Não foi possível buscar o cartão.')
}

// Usado pela regra de "não permitir cartões duplicados" — comparação
// insensível a maiúsculas/minúsculas, mesma semântica do índice único.
function findByName(userId, name, { excludeId } = {}) {
  return run((db) => {
    const query = excludeId
      ? 'SELECT * FROM credit_cards WHERE user_id = ? AND name = ? COLLATE NOCASE AND id != ?'
      : 'SELECT * FROM credit_cards WHERE user_id = ? AND name = ? COLLATE NOCASE'
    const params = excludeId ? [userId, name, excludeId] : [userId, name]
    return db.prepare(query).get(...params)
  }, 'Não foi possível verificar duplicidade de cartão.')
}

function update(userId, id, patch) {
  return run(async (db) => {
    const columns = {
      name: 'name',
      creditLimit: 'credit_limit',
      closingDay: 'closing_day',
      dueDay: 'due_day',
      isActive: 'is_active',
    }
    const sets = []
    const params = { id, userId }

    for (const [key, column] of Object.entries(columns)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = key === 'isActive' ? (patch[key] ? 1 : 0) : patch[key]
    }

    sets.push("updated_at = datetime('now')")

    await db.prepare(`UPDATE credit_cards SET ${sets.join(', ')} WHERE id = @id AND user_id = @userId`).run(params)
    return db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(id, userId)
  }, 'Não foi possível atualizar o cartão.')
}

function setActive(userId, id, isActive) {
  return run(async (db) => {
    await db.prepare("UPDATE credit_cards SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(isActive ? 1 : 0, id, userId)
    return db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(id, userId)
  }, 'Não foi possível alterar o status do cartão.')
}

function remove(userId, id) {
  return run(async (db) => {
    await db.prepare('DELETE FROM credit_cards WHERE id = ? AND user_id = ?').run(id, userId)
  }, 'Não foi possível excluir o cartão.')
}

module.exports = { create, findAll, findById, findByName, update, setActive, remove }
