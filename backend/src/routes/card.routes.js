const { Router } = require('express')
const cardController = require('../controllers/card.controller')
const validate = require('../middlewares/validate.middleware')
const { createCardSchema, updateCardSchema, cardIdParamSchema, listCardsQuerySchema } = require('../schemas/card.schema')

const router = Router()

router.get('/', validate(listCardsQuerySchema, 'query'), cardController.list)
router.get('/:id/summary', validate(cardIdParamSchema, 'params'), cardController.getSummary)
router.get('/:id', validate(cardIdParamSchema, 'params'), cardController.getById)
router.post('/', validate(createCardSchema, 'body'), cardController.create)
router.put('/:id', validate(cardIdParamSchema, 'params'), validate(updateCardSchema, 'body'), cardController.update)
router.delete('/:id', validate(cardIdParamSchema, 'params'), cardController.remove)

module.exports = router
