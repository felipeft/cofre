const { Router } = require('express')
const systemRoutes = require('./system.routes')

const router = Router()

// Novos grupos de rota (categories.routes.js, transactions.routes.js...)
// entram aqui, cada um com seu próprio prefixo, ex:
//   router.use('/categories', categoryRoutes)
router.use(systemRoutes)

module.exports = router
