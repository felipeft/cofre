const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function findById(userId) {
  return run((db) => db.prepare('SELECT * FROM users WHERE id = ?').get(userId), 'Não foi possível consultar o perfil.')
}

function updateDisplayName(userId, displayName) {
  return run(async (db) => {
    await db.prepare("UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?").run(displayName, userId)
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  }, 'Não foi possível atualizar o perfil.')
}

module.exports = { findById, updateDisplayName }
