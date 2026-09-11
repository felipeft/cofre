const crypto = require('crypto')
const sheetsService = require('./googleSheets.service')
const repository = require('../repositories/googleSheetsSync.repository')
const ConflictError = require('../errors/ConflictError')
const logger = require('../utils/logger')
const MAX_STORED_ISSUES_PER_TYPE = 50

function limitedIssues(details) {
  const invalid = (details.invalid || []).slice(0, MAX_STORED_ISSUES_PER_TYPE)
  const conflicts = (details.conflicts || []).slice(0, MAX_STORED_ISSUES_PER_TYPE)
  return {
    invalid,
    conflicts,
    truncated: invalid.length < (details.invalid || []).length || conflicts.length < (details.conflicts || []).length,
  }
}

async function getStatus(userId) {
  const [integration, latest] = await Promise.all([sheetsService.getStatus(userId), repository.latest(userId)])
  return { integrationStatus: integration.status, ready: integration.status === 'ready', latest }
}

function getHistory(userId, limit = 20) { return repository.history(userId, limit) }

async function synchronize(userId, idempotencyKey = crypto.randomUUID()) {
  const integration = await sheetsService.getStatus(userId)
  if (integration.status !== 'ready') throw new ConflictError('A integração Google Sheets precisa estar pronta antes de sincronizar.', [], 'GOOGLE_SHEETS_NOT_READY')

  const started = await repository.start(userId, idempotencyKey, 'manual')
  if (started.replayed) return { ...started.run, idempotentReplay: true }
  if (started.blocked) throw new ConflictError('Já existe uma sincronização em andamento.', [{ runId: started.run.id }], 'SYNC_ALREADY_RUNNING')

  const runId = started.run.id
  try {
    const preview = await sheetsService.previewImport(userId)
    const recordsRead = Object.values(preview.summary).reduce((total, value) => total + Number(value), 0)
    if (preview.summary.invalid || preview.summary.conflicts) {
      const completed = await repository.finish(userId, runId, {
        status: 'conflicts', recordsRead, recordsImported: 0,
        recordsExisting: preview.summary.existing, recordsExported: 0,
        conflictCount: preview.summary.conflicts, invalidCount: preview.summary.invalid,
        details: limitedIssues(preview.details),
      })
      logger.warn('Sincronização Google Sheets exige correção', { userId, runId, conflicts: completed.conflictCount, invalid: completed.invalidCount })
      return completed
    }

    let importedCount = 0
    if (preview.summary.new > 0) {
      const imported = await sheetsService.confirmImport(userId, preview.fingerprint)
      importedCount = imported.alreadyImported ? 0 : imported.importedCount
    }
    const exported = await sheetsService.exportData(userId)
    const completed = await repository.finish(userId, runId, {
      status: 'success', recordsRead, recordsImported: importedCount,
      recordsExisting: preview.summary.existing, recordsExported: exported.exportedRecords,
      conflictCount: 0, invalidCount: 0,
      details: { exportBreakdown: exported.breakdown },
    })
    logger.info('Sincronização Google Sheets concluída', { userId, runId, imported: importedCount, exported: exported.exportedRecords })
    return completed
  } catch (error) {
    try { await repository.fail(userId, runId, error) } catch (historyError) {
      logger.error('Falha ao registrar erro da sincronização', { userId, runId, error: historyError.message })
    }
    throw error
  }
}

module.exports = { getStatus, getHistory, synchronize }
