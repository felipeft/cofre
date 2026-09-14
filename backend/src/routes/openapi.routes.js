const { Router } = require('express')
const swaggerUi = require('swagger-ui-express')
const document = require('../openapi/document')

const router = Router()

router.get('/openapi.json', (req, res) => res.json(document))
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document, {
  customSiteTitle: 'Cofre API — Swagger',
  swaggerOptions: {
    persistAuthorization: false,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
}))

module.exports = router
