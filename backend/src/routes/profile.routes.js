const { Router } = require('express')
const controller = require('../controllers/profile.controller')
const validate = require('../middlewares/validate.middleware')
const { updateProfileSchema } = require('../schemas/profile.schema')

const router = Router()
router.get('/', controller.get)
router.patch('/', validate(updateProfileSchema, 'body'), controller.update)

module.exports = router
