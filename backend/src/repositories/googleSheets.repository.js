const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function findByUserId(userId) {
  return run((db) => db.prepare('SELECT * FROM google_sheets_integrations WHERE user_id = ?').get(userId), 'Não foi possível consultar a integração Google Sheets.')
}

function createAttempt({ stateHash, userId, nonce, codeVerifier, expiresAt }) {
  return run(async (db) => {
    await db.prepare("DELETE FROM google_sheets_oauth_attempts WHERE expires_at <= datetime('now')").run()
    await db.prepare('INSERT INTO google_sheets_oauth_attempts (state_hash, user_id, nonce, code_verifier, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(stateHash, userId, nonce, codeVerifier, expiresAt)
  }, 'Não foi possível iniciar a autorização Google Sheets.')
}

function consumeAttempt(stateHash, userId) {
  return run((db) => db.transaction(async (tx) => {
    const row = await tx.prepare("SELECT * FROM google_sheets_oauth_attempts WHERE state_hash = ? AND user_id = ? AND expires_at > datetime('now')").get(stateHash, userId)
    await tx.prepare('DELETE FROM google_sheets_oauth_attempts WHERE state_hash = ?').run(stateHash)
    return row
  }), 'Não foi possível validar a autorização Google Sheets.')
}

function saveAuthorization(userId, data) {
  return run(async (db) => {
    await db.prepare(`
      INSERT INTO google_sheets_integrations (
        user_id, google_sub, google_account_email, refresh_token_encrypted,
        granted_scopes, status, connected_at
      ) VALUES (@userId, @googleSub, @email, @refreshTokenEncrypted, @scopes, 'authorized', datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        google_sub = excluded.google_sub,
        google_account_email = excluded.google_account_email,
        refresh_token_encrypted = COALESCE(excluded.refresh_token_encrypted, google_sheets_integrations.refresh_token_encrypted),
        granted_scopes = excluded.granted_scopes,
        status = CASE WHEN google_sheets_integrations.spreadsheet_id IS NULL THEN 'authorized' ELSE 'ready' END,
        connected_at = datetime('now'), last_error_code = NULL, last_error_at = NULL,
        updated_at = datetime('now')
    `).run({ userId, ...data })
    return db.prepare('SELECT * FROM google_sheets_integrations WHERE user_id = ?').get(userId)
  }, 'Não foi possível persistir a autorização Google Sheets.')
}

function saveSpreadsheet(userId, { spreadsheetId, spreadsheetName, startYear }) {
  return run(async (db) => {
    await db.prepare(`UPDATE google_sheets_integrations SET spreadsheet_id = ?, spreadsheet_name = ?, start_year = ?, status = 'ready', last_error_code = NULL, last_error_at = NULL, updated_at = datetime('now') WHERE user_id = ?`)
      .run(spreadsheetId, spreadsheetName, startYear, userId)
    return db.prepare('SELECT * FROM google_sheets_integrations WHERE user_id = ?').get(userId)
  }, 'Não foi possível associar a planilha ao usuário.')
}

function markOperation(userId, operation) {
  const column = operation === 'export' ? 'last_export_at' : 'last_import_at'
  const clearExportRequirement = operation === 'export' ? ', requires_full_export = 0' : ''
  return run((db) => db.prepare(`UPDATE google_sheets_integrations SET ${column} = datetime('now'), status = 'ready', last_error_code = NULL, last_error_at = NULL${clearExportRequirement}, updated_at = datetime('now') WHERE user_id = ?`).run(userId), 'Não foi possível atualizar o estado da integração.')
}

function markError(userId, { status, code, clearToken = false }) {
  return run((db) => db.prepare(`UPDATE google_sheets_integrations SET status = ?, last_error_code = ?, last_error_at = datetime('now'), refresh_token_encrypted = CASE WHEN ? THEN NULL ELSE refresh_token_encrypted END, updated_at = datetime('now') WHERE user_id = ?`).run(status, code, clearToken ? 1 : 0, userId), 'Não foi possível registrar a falha da integração.')
}

function remove(userId) {
  return run((db) => db.prepare('DELETE FROM google_sheets_integrations WHERE user_id = ?').run(userId), 'Não foi possível desconectar a integração.')
}

function suggestedStartYear(userId, currentYear) {
  return run(async (db) => {
    const row = await db.prepare('SELECT MIN(competence_year) AS year FROM transactions WHERE user_id = ?').get(userId)
    return Number(row?.year) || currentYear
  }, 'Não foi possível determinar o ano inicial.')
}

module.exports = { findByUserId, createAttempt, consumeAttempt, saveAuthorization, saveSpreadsheet, markOperation, markError, remove, suggestedStartYear }
