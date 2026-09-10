const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

function run(fn, errorMessage) {
  try { return fn(getDatabase()) } catch (err) { throw new DatabaseError(errorMessage, [err.message]) }
}

function create({ cardId, amount, paidAt, notes }) {
  return run((db) => {
    const { lastInsertRowid } = db.prepare(`INSERT INTO credit_card_payments (card_id, amount, paid_at, notes) VALUES (@cardId, @amount, @paidAt, @notes)`).run({ cardId, amount, paidAt, notes })
    return db.prepare('SELECT * FROM credit_card_payments WHERE id = ?').get(lastInsertRowid)
  }, 'Não foi possível registrar o pagamento da fatura.')
}

function findByCardId(cardId) {
  return run((db) => db.prepare('SELECT * FROM credit_card_payments WHERE card_id = ? ORDER BY paid_at DESC, id DESC').all(cardId), 'Não foi possível buscar os pagamentos da fatura.')
}

function existsByCardId(cardId) {
  return run((db) => Boolean(db.prepare('SELECT EXISTS(SELECT 1 FROM credit_card_payments WHERE card_id = ?) AS used').get(cardId).used), 'Não foi possível verificar pagamentos do cartão.')
}

module.exports = { create, findByCardId, existsByCardId }
