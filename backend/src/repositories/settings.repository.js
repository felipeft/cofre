const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function findByUserId(userId) {
  return run(async (db) => {
    await db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId)
    return db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId)
  }, 'Não foi possível consultar as preferências do usuário.')
}

function update(userId, patch) {
  return run(async (db) => {
    await db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId)
    const columns = {
      defaultOfferRate: 'default_offer_rate',
      defaultTitheRate: 'default_tithe_rate',
      theme: 'theme',
    }
    const sets = []
    const params = { userId }
    for (const [key, column] of Object.entries(columns)) {
      if (patch[key] === undefined) continue
      sets.push(`${column} = @${key}`)
      params[key] = patch[key]
    }
    sets.push("updated_at = datetime('now')")
    await db.prepare(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = @userId`).run(params)
    return db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId)
  }, 'Não foi possível atualizar as preferências do usuário.')
}

module.exports = { findByUserId, update }
