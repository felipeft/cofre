const { Router } = require('express')
const systemRoutes = require('./system.routes')
const categoryRoutes = require('./category.routes')
const transactionRoutes = require('./transaction.routes')
const cardRoutes = require('./card.routes')
const recurringExpenseRoutes = require('./recurringExpense.routes')
const authRoutes = require('./auth.routes')
const { requireAuth, protectAgainstCsrf } = require('../middlewares/auth.middleware')

const router = Router()

router.use(systemRoutes)
router.use('/auth', authRoutes)
router.use(requireAuth, protectAgainstCsrf)
router.use('/categories', categoryRoutes)
router.use('/transactions', transactionRoutes)
router.use('/cards', cardRoutes)
router.use('/recurring-expenses', recurringExpenseRoutes)

module.exports = router
