const { Router } = require('express')
const controller = require('../controllers/dataManagement.controller')
const validate = require('../middlewares/validate.middleware')
const { previewQuerySchema, clearRecordsSchema, resetSchema } = require('../schemas/dataManagement.schema')

const router = Router()
router.get('/preview', validate(previewQuerySchema, 'query'), controller.preview)
router.post('/clear-records', validate(clearRecordsSchema, 'body'), controller.clearRecords)
router.post('/reset', validate(resetSchema, 'body'), controller.reset)

module.exports = router
