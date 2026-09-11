const { Router } = require('express')
const controller = require('../controllers/settings.controller')
const validate = require('../middlewares/validate.middleware')
const { updateSettingsSchema } = require('../schemas/settings.schema')

const router = Router()
router.get('/', controller.get)
router.patch('/', validate(updateSettingsSchema, 'body'), controller.update)

module.exports = router
