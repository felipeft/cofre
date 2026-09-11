const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function preview(userId) {
  return run(async (db) => {
    const row = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM transactions WHERE user_id = @userId) AS transactions,
        (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = @userId) AS recurring_expenses,
        (SELECT COUNT(*) FROM categories WHERE user_id = @userId) AS categories,
        (SELECT COUNT(*) FROM credit_cards WHERE user_id = @userId) AS cards,
        (SELECT COUNT(*) FROM credit_card_payments WHERE user_id = @userId) AS card_payments,
        (SELECT COUNT(*) FROM google_sheets_imports WHERE user_id = @userId) AS sheet_imports,
        (SELECT COUNT(*) FROM google_sheets_sync_runs WHERE user_id = @userId) AS sync_runs,
        EXISTS(SELECT 1 FROM google_sheets_integrations WHERE user_id = @userId AND spreadsheet_id IS NOT NULL) AS has_spreadsheet
    `).get({ userId })
    return row
  }, 'Não foi possível calcular o impacto da operação.')
}

function clearFinancialRecords(userId, generatedThrough) {
  return run((db) => db.transaction(async (tx) => {
    const counts = await previewWithExecutor(tx, userId)
    await tx.prepare('DELETE FROM credit_card_payments WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM google_sheets_imports WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM google_sheets_sync_runs WHERE user_id = ?').run(userId)
    await tx.prepare("UPDATE recurring_expenses SET generated_through = ?, updated_at = datetime('now') WHERE user_id = ?").run(generatedThrough, userId)
    await markSpreadsheetForExport(tx, userId)
    return counts
  }), 'Não foi possível limpar os registros financeiros.')
}

function reset(userId) {
  return run((db) => db.transaction(async (tx) => {
    const counts = await previewWithExecutor(tx, userId)
    await tx.prepare('DELETE FROM credit_card_payments WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM recurring_expenses WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM credit_cards WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM categories WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM google_sheets_imports WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM google_sheets_sync_runs WHERE user_id = ?').run(userId)
    await tx.prepare('DELETE FROM google_sheets_oauth_attempts WHERE user_id = ?').run(userId)
    await markSpreadsheetForExport(tx, userId)
    return counts
  }), 'Não foi possível resetar os dados do Cofre.')
}

async function previewWithExecutor(executor, userId) {
  return executor.prepare(`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE user_id = @userId) AS transactions,
      (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = @userId) AS recurring_expenses,
      (SELECT COUNT(*) FROM categories WHERE user_id = @userId) AS categories,
      (SELECT COUNT(*) FROM credit_cards WHERE user_id = @userId) AS cards,
      (SELECT COUNT(*) FROM credit_card_payments WHERE user_id = @userId) AS card_payments,
      (SELECT COUNT(*) FROM google_sheets_imports WHERE user_id = @userId) AS sheet_imports,
      (SELECT COUNT(*) FROM google_sheets_sync_runs WHERE user_id = @userId) AS sync_runs,
      EXISTS(SELECT 1 FROM google_sheets_integrations WHERE user_id = @userId AND spreadsheet_id IS NOT NULL) AS has_spreadsheet
  `).get({ userId })
}

function markSpreadsheetForExport(executor, userId) {
  return executor.prepare("UPDATE google_sheets_integrations SET requires_full_export = 1, updated_at = datetime('now') WHERE user_id = ?").run(userId)
}

module.exports = { preview, clearFinancialRecords, reset }
