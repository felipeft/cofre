const { getDatabase } = require('../database/connection')
const DatabaseError = require('../errors/DatabaseError')

const STALE_AFTER_MINUTES = 15

async function run(fn, message) {
  try { return await fn(getDatabase()) } catch (error) { throw new DatabaseError(message, [error.message]) }
}

function parseDetails(value) {
  try { return JSON.parse(value || '{}') } catch { return {} }
}

function mapRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    idempotencyKey: row.idempotency_key,
    trigger: row.trigger_source,
    status: row.status,
    recordsRead: Number(row.records_read),
    recordsImported: Number(row.records_imported),
    recordsExisting: Number(row.records_existing),
    recordsExported: Number(row.records_exported),
    conflictCount: Number(row.conflict_count),
    invalidCount: Number(row.invalid_count),
    details: parseDetails(row.details_json),
    error: row.error_code ? { code: row.error_code, message: row.error_message } : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

async function expireStale(db, userId) {
  await db.prepare(`
    UPDATE google_sheets_sync_runs
    SET status = 'failed', error_code = 'SYNC_INTERRUPTED',
        error_message = 'A sincronização foi interrompida antes da conclusão.',
        completed_at = datetime('now')
    WHERE user_id = ? AND status = 'running'
      AND started_at <= datetime('now', '-' || ? || ' minutes')
  `).run(userId, STALE_AFTER_MINUTES)
}

function start(userId, idempotencyKey, trigger = 'manual') {
  return run((db) => db.transaction(async (tx) => {
    await expireStale(tx, userId)
    const previous = await tx.prepare('SELECT * FROM google_sheets_sync_runs WHERE user_id = ? AND idempotency_key = ?').get(userId, idempotencyKey)
    if (previous) return { run: mapRow(previous), replayed: true, blocked: false }
    const active = await tx.prepare("SELECT * FROM google_sheets_sync_runs WHERE user_id = ? AND status = 'running' ORDER BY id DESC LIMIT 1").get(userId)
    if (active) return { run: mapRow(active), replayed: false, blocked: true }
    const result = await tx.prepare('INSERT INTO google_sheets_sync_runs (user_id, idempotency_key, trigger_source) VALUES (?, ?, ?)').run(userId, idempotencyKey, trigger)
    const created = await tx.prepare('SELECT * FROM google_sheets_sync_runs WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, userId)
    return { run: mapRow(created), replayed: false, blocked: false }
  }), 'Não foi possível iniciar a sincronização.')
}

function finish(userId, runId, result) {
  return run(async (db) => {
    await db.prepare(`
      UPDATE google_sheets_sync_runs SET
        status = @status, records_read = @recordsRead, records_imported = @recordsImported,
        records_existing = @recordsExisting, records_exported = @recordsExported,
        conflict_count = @conflictCount, invalid_count = @invalidCount,
        details_json = @detailsJson, completed_at = datetime('now')
      WHERE id = @runId AND user_id = @userId AND status = 'running'
    `).run({ userId, runId, ...result, detailsJson: JSON.stringify(result.details || {}) })
    return mapRow(await db.prepare('SELECT * FROM google_sheets_sync_runs WHERE id = ? AND user_id = ?').get(runId, userId))
  }, 'Não foi possível concluir o histórico da sincronização.')
}

function fail(userId, runId, error) {
  return run(async (db) => {
    await db.prepare(`
      UPDATE google_sheets_sync_runs SET status = 'failed', error_code = ?, error_message = ?,
        completed_at = datetime('now')
      WHERE id = ? AND user_id = ? AND status = 'running'
    `).run(String(error.code || 'SYNC_FAILED').slice(0, 100), String(error.message || 'Falha na sincronização.').slice(0, 500), runId, userId)
    return mapRow(await db.prepare('SELECT * FROM google_sheets_sync_runs WHERE id = ? AND user_id = ?').get(runId, userId))
  }, 'Não foi possível registrar a falha da sincronização.')
}

function latest(userId) {
  return run(async (db) => {
    await expireStale(db, userId)
    return mapRow(await db.prepare('SELECT * FROM google_sheets_sync_runs WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId))
  }, 'Não foi possível consultar o estado da sincronização.')
}

function history(userId, limit) {
  return run(async (db) => {
    await expireStale(db, userId)
    const rows = await db.prepare('SELECT * FROM google_sheets_sync_runs WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit)
    return rows.map(mapRow)
  }, 'Não foi possível consultar o histórico de sincronizações.')
}

module.exports = { start, finish, fail, latest, history }
