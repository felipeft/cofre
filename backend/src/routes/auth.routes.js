const { Router } = require('express')
const controller = require('../controllers/auth.controller')
const { protectAgainstCsrf } = require('../middlewares/auth.middleware')
const router = Router()

router.get('/google', controller.google)
router.get('/google/callback', controller.callback)
router.get('/me', controller.me)
router.post('/logout', protectAgainstCsrf, controller.logout)

module.exports = router
