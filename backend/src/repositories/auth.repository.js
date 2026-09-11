const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function upsertUser({ googleSub, email, name, avatarUrl }) {
  return run(async (db) => {
    await db.prepare(`
      INSERT INTO users (google_sub, email, name, avatar_url)
      VALUES (@googleSub, @email, @name, @avatarUrl)
      ON CONFLICT(google_sub) DO UPDATE SET
        email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url,
        updated_at = datetime('now')
    `).run({ googleSub, email, name, avatarUrl: avatarUrl ?? null })
    return db.prepare('SELECT * FROM users WHERE google_sub = ?').get(googleSub)
  }, 'Não foi possível salvar o usuário.')
}

function createLoginAttempt({ stateHash, nonce, codeVerifier, expiresAt }) {
  return run(async (db) => {
    await db.prepare("DELETE FROM oauth_login_attempts WHERE expires_at <= datetime('now')").run()
    await db.prepare('INSERT INTO oauth_login_attempts (state_hash, nonce, code_verifier, expires_at) VALUES (?, ?, ?, ?)')
      .run(stateHash, nonce, codeVerifier, expiresAt)
  }, 'Não foi possível iniciar o login.')
}

function consumeLoginAttempt(stateHash) {
  return run((db) => db.transaction(async (tx) => {
    const attempt = await tx.prepare("SELECT * FROM oauth_login_attempts WHERE state_hash = ? AND expires_at > datetime('now')").get(stateHash)
    await tx.prepare('DELETE FROM oauth_login_attempts WHERE state_hash = ?').run(stateHash)
    return attempt
  }), 'Não foi possível validar o login.')
}

function createSession({ tokenHash, userId, expiresAt }) {
  return run(async (db) => {
    await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
    await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt)
  }, 'Não foi possível criar a sessão.')
}

function findSession(tokenHash) {
  return run((db) => db.prepare(`
    SELECT s.token_hash, s.created_at, s.expires_at, s.last_seen_at,
           u.id AS user_id, u.google_sub, u.email, u.name, u.avatar_url
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).get(tokenHash), 'Não foi possível consultar a sessão.')
}

function renewSession(tokenHash, expiresAt) {
  return run((db) => db.prepare("UPDATE sessions SET expires_at = ?, last_seen_at = datetime('now') WHERE token_hash = ?")
    .run(expiresAt, tokenHash), 'Não foi possível renovar a sessão.')
}

function deleteSession(tokenHash) {
  return run((db) => db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash), 'Não foi possível encerrar a sessão.')
}

function claimLegacyData(userId) {
  return run((db) => db.transaction(async (tx) => {
    const tables = ['categories', 'credit_cards', 'recurring_expenses', 'transactions', 'credit_card_payments']
    const claimed = {}
    for (const table of tables) {
      claimed[table] = (await tx.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId)).changes
    }
    return claimed
  }), 'Não foi possível associar os dados existentes ao usuário.')
}

module.exports = { upsertUser, createLoginAttempt, consumeLoginAttempt, createSession, findSession, renewSession, deleteSession, claimLegacyData }
