const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function getExportData(userId) {
  return run(async (db) => {
    const transactions = await db.prepare(`
      SELECT t.*, c.name AS category_name, cc.name AS card_name
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      LEFT JOIN credit_cards cc ON cc.id = t.card_id
      WHERE t.user_id = ? ORDER BY t.competence_year, t.date, t.id
    `).all(userId)
    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, sort_order, name COLLATE NOCASE').all(userId)
    const cards = await db.prepare('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY name COLLATE NOCASE').all(userId)
    const recurringExpenses = await db.prepare(`
      SELECT r.*, c.name AS category_name, cc.name AS card_name
      FROM recurring_expenses r JOIN categories c ON c.id = r.category_id
      LEFT JOIN credit_cards cc ON cc.id = r.card_id
      WHERE r.user_id = ? ORDER BY r.id
    `).all(userId)
    const payments = await db.prepare(`
      SELECT p.*, cc.name AS card_name FROM credit_card_payments p
      JOIN credit_cards cc ON cc.id = p.card_id WHERE p.user_id = ? ORDER BY p.paid_at, p.id
    `).all(userId)
    const settings = await db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId)
    return { transactions, categories, cards, recurringExpenses, payments, settings }
  }, 'Não foi possível preparar os dados para exportação.')
}

function getOwnedReferences(userId) {
  return run(async (db) => {
    const categories = await db.prepare('SELECT id, type, name, is_active FROM categories WHERE user_id = ?').all(userId)
    const cards = await db.prepare('SELECT id, name, is_active FROM credit_cards WHERE user_id = ?').all(userId)
    const recurring = await db.prepare('SELECT id FROM recurring_expenses WHERE user_id = ?').all(userId)
    return {
      categories: new Map(categories.map((row) => [Number(row.id), row.type])),
      categoriesByName: new Map(categories.filter((row) => row.is_active).map((row) => [`${row.type}:${String(row.name).trim().toLocaleLowerCase('pt-BR')}`, Number(row.id)])),
      cards: new Set(cards.map((row) => Number(row.id))),
      cardsByName: new Map(cards.filter((row) => row.is_active).map((row) => [String(row.name).trim().toLocaleLowerCase('pt-BR'), Number(row.id)])),
      recurring: new Set(recurring.map((row) => Number(row.id))),
    }
  }, 'Não foi possível validar as referências da importação.')
}

function findTransactionForImport(userId, id) {
  return run((db) => db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId), 'Não foi possível comparar a transação importada.')
}

function findTransactionsForImport(userId) {
  return run((db) => db.prepare(`
    SELECT t.*, c.name AS category_name, cc.name AS card_name
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    LEFT JOIN credit_cards cc ON cc.id = t.card_id
    WHERE t.user_id = ?
  `).all(userId), 'Não foi possível comparar as transações importadas.')
}

function importTransactions(userId, candidates, fingerprint) {
  return run((db) => db.transaction(async (tx) => {
    const previous = await tx.prepare('SELECT imported_count FROM google_sheets_imports WHERE user_id = ? AND fingerprint = ?').get(userId, fingerprint)
    if (previous) return { ids: [], alreadyImported: true, importedCount: Number(previous.imported_count) }
    const statement = tx.prepare(`
      INSERT INTO transactions (
        user_id, description, amount, type, category_id, date, competence_month, competence_year,
        notes, source, is_recurring, is_fixed, card, card_id, installment_current, installment_total,
        installment_group_id, tags, status, offer_amount, tithe_amount, offer_rate_applied,
        tithe_rate_applied, recurring_expense_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const ids = []
    for (const item of candidates) {
      const result = await statement.run(
        userId, item.description, item.amount, item.type, item.categoryId, item.date,
        item.competenceMonth, item.competenceYear, item.notes, 'sheets_import',
        item.isRecurring ? 1 : 0, item.isFixed ? 1 : 0, item.cardId,
        item.installmentCurrent, item.installmentTotal, item.installmentGroupId,
        JSON.stringify(item.tags), item.status, item.offerAmount, item.titheAmount,
        item.offerRateApplied, item.titheRateApplied, item.recurringExpenseId
      )
      ids.push(result.lastInsertRowid)
    }
    await tx.prepare('INSERT INTO google_sheets_imports (user_id, fingerprint, imported_count) VALUES (?, ?, ?)').run(userId, fingerprint, ids.length)
    return { ids, alreadyImported: false, importedCount: ids.length }
  }), 'A importação falhou e nenhuma transação foi gravada.')
}

module.exports = { getExportData, getOwnedReferences, findTransactionForImport, findTransactionsForImport, importTransactions }
