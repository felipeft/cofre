const { Router } = require('express')
const transactionController = require('../controllers/transaction.controller')
const validate = require('../middlewares/validate.middleware')
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  listTransactionsQuerySchema,
  financialSummaryQuerySchema,
} = require('../schemas/transaction.schema')

const router = Router()

// Precisa vir ANTES de /:id — senão "summary" seria interpretado como um id
// e cairia na validação de id inválido.
router.get('/summary', validate(financialSummaryQuerySchema, 'query'), transactionController.getSummary)
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
