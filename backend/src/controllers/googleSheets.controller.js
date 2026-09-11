const service = require('../services/googleSheets.service')
const syncService = require('../services/googleSheetsSync.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const { parseCookies, serializeCookie } = require('../utils/cookies')
const logger = require('../utils/logger')

const status = asyncHandler(async (req, res) => apiResponse.success(res, { data: await service.getStatus(req.user.id) }))

const connect = asyncHandler(async (req, res) => {
  const result = await service.beginAuthorization(req.user)
  res.setHeader('Set-Cookie', serializeCookie(service.STATE_COOKIE_NAME, result.stateCookie, service.stateCookieSettings()))
  res.redirect(result.authorizationUrl)
})

const callback = asyncHandler(async (req, res) => {
  const clearCookie = serializeCookie(service.STATE_COOKIE_NAME, '', { ...service.stateCookieSettings(), maxAge: 0 })
  try {
    if (req.query.error) throw new Error('Autorização cancelada pelo usuário.')
    const cookies = parseCookies(req.headers.cookie)
    await service.completeAuthorization(req.user, { code: req.query.code, state: req.query.state, stateCookie: cookies[service.STATE_COOKIE_NAME] })
    res.setHeader('Set-Cookie', clearCookie)
    return res.redirect(service.frontendRedirect('?sheets=connected'))
  } catch (error) {
    logger.error('Falha no callback Google Sheets', { requestId: req.id, userId: req.user.id, code: error.code || 'GOOGLE_CALLBACK_FAILED', error: error.message })
    res.setHeader('Set-Cookie', clearCookie)
    return res.redirect(service.frontendRedirect(`?sheets_error=${encodeURIComponent(error.code || 'failed')}`))
  }
})

const createSpreadsheet = asyncHandler(async (req, res) => apiResponse.success(res, { data: await service.createSpreadsheet(req.user.id, req.validated.body), message: 'Planilha do Cofre criada com sucesso.', statusCode: 201 }))
const exportData = asyncHandler(async (req, res) => apiResponse.success(res, { data: await service.exportData(req.user.id), message: 'Dados exportados com sucesso.' }))
const previewImport = asyncHandler(async (req, res) => apiResponse.success(res, { data: await service.previewImport(req.user.id) }))
const confirmImport = asyncHandler(async (req, res) => apiResponse.success(res, { data: await service.confirmImport(req.user.id, req.validated.body.fingerprint), message: 'Importação concluída com sucesso.' }))
const disconnect = asyncHandler(async (req, res) => {
  await service.disconnect(req.user.id)
  apiResponse.success(res, { data: null, message: 'Integração desconectada. A planilha permanece no Google Drive.' })
})

const syncStatus = asyncHandler(async (req, res) => apiResponse.success(res, { data: await syncService.getStatus(req.user.id) }))
const syncHistory = asyncHandler(async (req, res) => apiResponse.success(res, { data: await syncService.getHistory(req.user.id, req.validated.query.limit) }))
const synchronize = asyncHandler(async (req, res) => apiResponse.success(res, { data: await syncService.synchronize(req.user.id, req.validated.body.requestId), message: 'Sincronização processada.' }))

module.exports = { status, connect, callback, createSpreadsheet, exportData, previewImport, confirmImport, disconnect, syncStatus, syncHistory, synchronize }
