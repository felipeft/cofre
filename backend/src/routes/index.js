const { Router } = require('express')
const systemRoutes = require('./system.routes')
const categoryRoutes = require('./category.routes')
const transactionRoutes = require('./transaction.routes')

const router = Router()

router.use(systemRoutes)
router.use('/categories', categoryRoutes)
router.use('/transactions', transactionRoutes)

module.exports = router
