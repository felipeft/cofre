const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, errorMessage) {
  try {
    return await fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

function create(userId, { name, type, color, icon, isActive, sortOrder }) {
  return run(async (db) => {
    const { lastInsertRowid } = await db
      .prepare(
        `INSERT INTO categories (user_id, name, type, color, icon, is_active, sort_order)
         VALUES (@userId, @name, @type, @color, @icon, @isActive, @sortOrder)`
      )
      .run({
        userId, name,
        type,
        color,
        icon,
        isActive: isActive ? 1 : 0,
        sortOrder,
      })

    return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(lastInsertRowid, userId)
  }, 'Não foi possível criar a categoria.')
}

function findAll(userId, { includeInactive = false, type } = {}) {
  return run(async (db) => {
    const conditions = ['user_id = @userId']
    const params = { userId }

    if (!includeInactive) {
      conditions.push('is_active = 1')
    }
    if (type) {
      conditions.push('type = @type')
      params.type = type
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    return db
      .prepare(`SELECT * FROM categories ${where} ORDER BY sort_order ASC, name COLLATE NOCASE ASC`)
      .all(params)
  }, 'Não foi possível listar as categorias.')
}

function findById(userId, id) {
  return run((db) => db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId), 'Não foi possível buscar a categoria.')
}

// Usado pela regra de "não permitir categorias duplicadas" — comparação
// insensível a maiúsculas/minúsculas, mesma semântica do índice único.
function findByTypeAndName(userId, type, name, { excludeId } = {}) {
  return run(async (db) => {
    const query = excludeId
      ? 'SELECT * FROM categories WHERE user_id = ? AND type = ? AND name = ? COLLATE NOCASE AND id != ?'
      : 'SELECT * FROM categories WHERE user_id = ? AND type = ? AND name = ? COLLATE NOCASE'
    const params = excludeId ? [userId, type, name, excludeId] : [userId, type, name]
    return db.prepare(query).get(...params)
  }, 'Não foi possível verificar duplicidade de categoria.')
}

function update(userId, id, patch) {
  return run(async (db) => {
    const columns = {
      name: 'name',
      type: 'type',
      color: 'color',
      icon: 'icon',
      isActive: 'is_active',
      sortOrder: 'sort_order',
    }
    const booleanKeys = new Set(['isActive'])

    const sets = []
    const params = { id, userId }

    for (const [key, column] of Object.entries(columns)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = booleanKeys.has(key) ? (patch[key] ? 1 : 0) : patch[key]
    }

    sets.push("updated_at = datetime('now')")

    await db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = @id AND user_id = @userId`).run(params)
    return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId)
  }, 'Não foi possível atualizar a categoria.')
}

function setActive(userId, id, isActive) {
  return run(async (db) => {
    await db.prepare("UPDATE categories SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(isActive ? 1 : 0, id, userId)
    return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId)
  }, 'Não foi possível alterar o status da categoria.')
}

function remove(userId, id) {
  return run((db) => db.transaction(async (tx) => {
    await tx.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId)
    await tx.prepare("UPDATE google_sheets_integrations SET requires_full_export = 1, updated_at = datetime('now') WHERE user_id = ?").run(userId)
  }), 'Não foi possível excluir a categoria.')
}

function deletionPreview(userId, id) {
  return run((db) => db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE user_id = @userId AND category_id = @id) AS transactions,
      (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = @userId AND category_id = @id) AS recurring_expenses
  `).get({ userId, id }), 'Não foi possível calcular o impacto da exclusão da categoria.')
}

module.exports = { create, findAll, findById, findByTypeAndName, update, setActive, deletionPreview, remove }
