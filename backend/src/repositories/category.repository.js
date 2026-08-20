const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

function run(fn, errorMessage) {
  try {
    return fn(getDatabase())
  } catch (err) {
    throw new DatabaseError(errorMessage, [err.message])
  }
}

function create({ name, type, color, icon, isActive, sortOrder, applyOffer, offerRate, applyTithe, titheRate }) {
  return run((db) => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO categories (name, type, color, icon, is_active, sort_order, apply_offer, offer_rate, apply_tithe, tithe_rate)
         VALUES (@name, @type, @color, @icon, @isActive, @sortOrder, @applyOffer, @offerRate, @applyTithe, @titheRate)`
      )
      .run({
        name,
        type,
        color,
        icon,
        isActive: isActive ? 1 : 0,
        sortOrder,
        applyOffer: applyOffer ? 1 : 0,
        offerRate: offerRate ?? null,
        applyTithe: applyTithe ? 1 : 0,
        titheRate: titheRate ?? null,
      })

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid)
  }, 'Não foi possível criar a categoria.')
}

function findAll({ includeInactive = false, type } = {}) {
  return run((db) => {
    const conditions = []
    const params = {}

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

function findById(id) {
  return run((db) => db.prepare('SELECT * FROM categories WHERE id = ?').get(id), 'Não foi possível buscar a categoria.')
}

// Usado pela regra de "não permitir categorias duplicadas" — comparação
// insensível a maiúsculas/minúsculas, mesma semântica do índice único.
function findByTypeAndName(type, name, { excludeId } = {}) {
  return run((db) => {
    const query = excludeId
      ? 'SELECT * FROM categories WHERE type = ? AND name = ? COLLATE NOCASE AND id != ?'
      : 'SELECT * FROM categories WHERE type = ? AND name = ? COLLATE NOCASE'
    const params = excludeId ? [type, name, excludeId] : [type, name]
    return db.prepare(query).get(...params)
  }, 'Não foi possível verificar duplicidade de categoria.')
}

function update(id, patch) {
  return run((db) => {
    const columns = {
      name: 'name',
      type: 'type',
      color: 'color',
      icon: 'icon',
      isActive: 'is_active',
      sortOrder: 'sort_order',
      applyOffer: 'apply_offer',
      offerRate: 'offer_rate',
      applyTithe: 'apply_tithe',
      titheRate: 'tithe_rate',
    }
    const booleanKeys = new Set(['isActive', 'applyOffer', 'applyTithe'])

    const sets = []
    const params = { id }

    for (const [key, column] of Object.entries(columns)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = booleanKeys.has(key) ? (patch[key] ? 1 : 0) : patch[key]
    }

    sets.push("updated_at = datetime('now')")

    db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  }, 'Não foi possível atualizar a categoria.')
}

function setActive(id, isActive) {
  return run((db) => {
    db.prepare("UPDATE categories SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, id)
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  }, 'Não foi possível alterar o status da categoria.')
}

function remove(id) {
  return run((db) => {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }, 'Não foi possível excluir a categoria.')
}

module.exports = { create, findAll, findById, findByTypeAndName, update, setActive, remove }
