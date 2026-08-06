const { Router } = require('express')
const transactionController = require('../controllers/transaction.controller')
const validate = require('../middlewares/validate.middleware')
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  listTransactionsQuerySchema,
} = require('../schemas/transaction.schema')

const router = Router()

router.get('/', validate(listTransactionsQuerySchema, 'query'), transactionController.list)
router.get('/:id', validate(transactionIdParamSchema, 'params'), transactionController.getById)
router.post('/', validate(createTransactionSchema, 'body'), transactionController.create)
router.put(
  '/:id',
  validate(transactionIdParamSchema, 'params'),
  validate(updateTransactionSchema, 'body'),
  transactionController.update
)
router.delete('/:id', validate(transactionIdParamSchema, 'params'), transactionController.remove)

module.exports = router
