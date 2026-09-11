const { Router } = require('express')
const controller = require('../controllers/googleSheets.controller')
const validate = require('../middlewares/validate.middleware')
const { createSpreadsheetSchema, confirmImportSchema, synchronizeSchema, syncHistoryQuerySchema } = require('../schemas/googleSheets.schema')

const router = Router()
router.get('/', controller.status)
router.get('/connect', controller.connect)
router.get('/callback', controller.callback)
router.get('/sync', controller.syncStatus)
router.get('/sync/history', validate(syncHistoryQuerySchema, 'query'), controller.syncHistory)
router.post('/sync', validate(synchronizeSchema, 'body'), controller.synchronize)
router.post('/spreadsheet', validate(createSpreadsheetSchema, 'body'), controller.createSpreadsheet)
router.post('/export', controller.exportData)
router.post('/import/preview', controller.previewImport)
router.post('/import', validate(confirmImportSchema, 'body'), controller.confirmImport)
router.delete('/', controller.disconnect)

module.exports = router
