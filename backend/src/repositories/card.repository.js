const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

function run(fn, errorMessage) {
  try {
    return fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

function create({ name, creditLimit, closingDay, dueDay, isActive }) {
  return run((db) => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO credit_cards (name, credit_limit, closing_day, due_day, is_active)
         VALUES (@name, @creditLimit, @closingDay, @dueDay, @isActive)`
      )
      .run({ name, creditLimit, closingDay, dueDay, isActive: isActive ? 1 : 0 })

    return db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(lastInsertRowid)
  }, 'Não foi possível criar o cartão.')
}

function findAll({ includeInactive = false } = {}) {
  return run((db) => {
    const where = includeInactive ? '' : 'WHERE is_active = 1'
    return db.prepare(`SELECT * FROM credit_cards ${where} ORDER BY name COLLATE NOCASE ASC`).all()
  }, 'Não foi possível listar os cartões.')
}

function findById(id) {
  return run((db) => db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id), 'Não foi possível buscar o cartão.')
}

// Usado pela regra de "não permitir cartões duplicados" — comparação
// insensível a maiúsculas/minúsculas, mesma semântica do índice único.
function findByName(name, { excludeId } = {}) {
  return run((db) => {
    const query = excludeId
      ? 'SELECT * FROM credit_cards WHERE name = ? COLLATE NOCASE AND id != ?'
      : 'SELECT * FROM credit_cards WHERE name = ? COLLATE NOCASE'
    const params = excludeId ? [name, excludeId] : [name]
    return db.prepare(query).get(...params)
  }, 'Não foi possível verificar duplicidade de cartão.')
}

function update(id, patch) {
  return run((db) => {
    const columns = {
      name: 'name',
      creditLimit: 'credit_limit',
      closingDay: 'closing_day',
      dueDay: 'due_day',
      isActive: 'is_active',
    }
    const sets = []
    const params = { id }

    for (const [key, column] of Object.entries(columns)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = key === 'isActive' ? (patch[key] ? 1 : 0) : patch[key]
    }

    sets.push("updated_at = datetime('now')")

    db.prepare(`UPDATE credit_cards SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id)
  }, 'Não foi possível atualizar o cartão.')
}

function setActive(id, isActive) {
  return run((db) => {
    db.prepare("UPDATE credit_cards SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, id)
    return db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id)
  }, 'Não foi possível alterar o status do cartão.')
}

function remove(id) {
  return run((db) => {
    db.prepare('DELETE FROM credit_cards WHERE id = ?').run(id)
  }, 'Não foi possível excluir o cartão.')
}

module.exports = { create, findAll, findById, findByName, update, setActive, remove }
