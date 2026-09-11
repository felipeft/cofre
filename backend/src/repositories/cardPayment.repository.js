const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, errorMessage) {
  try { return await fn(getDatabase()) } catch (err) { throw new DatabaseError(errorMessage, [err.message]) }
}

function create(userId, { cardId, amount, paidAt, notes }) {
  return run(async (db) => {
    const { lastInsertRowid } = await db.prepare(`INSERT INTO credit_card_payments (user_id, card_id, amount, paid_at, notes) VALUES (@userId, @cardId, @amount, @paidAt, @notes)`).run({ userId, cardId, amount, paidAt, notes })
    return db.prepare('SELECT * FROM credit_card_payments WHERE id = ? AND user_id = ?').get(lastInsertRowid, userId)
  }, 'Não foi possível registrar o pagamento da fatura.')
}

function findByCardId(userId, cardId) {
  return run((db) => db.prepare('SELECT * FROM credit_card_payments WHERE user_id = ? AND card_id = ? ORDER BY paid_at DESC, id DESC').all(userId, cardId), 'Não foi possível buscar os pagamentos da fatura.')
}

function existsByCardId(userId, cardId) {
  return run(async (db) => {
    const row = await db.prepare('SELECT EXISTS(SELECT 1 FROM credit_card_payments WHERE user_id = ? AND card_id = ?) AS used').get(userId, cardId)
    return Boolean(row.used)
  }, 'Não foi possível verificar pagamentos do cartão.')
}

module.exports = { create, findByCardId, existsByCardId }
