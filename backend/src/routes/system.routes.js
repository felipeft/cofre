const { Router } = require('express')
const systemController = require('../controllers/system.controller')
const validate = require('../middlewares/validate.middleware')
const { healthQuerySchema } = require('../schemas/health.schema')

const router = Router()

router.get('/', systemController.getRoot)
router.get('/health', validate(healthQuerySchema, 'query'), systemController.getHealth)
router.get('/version', systemController.getVersion)
router.get('/status', systemController.getStatus)

module.exports = router
