const transactionService = require('../services/transaction.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const HTTP_STATUS = require('../constants/httpStatus')

const list = asyncHandler(async (req, res) => {
  const { data, meta } = await transactionService.listTransactions(req.user.id, req.validated.query)
  apiResponse.success(res, { data, meta })
})

const getById = asyncHandler(async (req, res) => {
  const data = await transactionService.getTransactionById(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data })
})

const create = asyncHandler(async (req, res) => {
  const data = await transactionService.createTransaction(req.user.id, req.validated.body)
  const message = Array.isArray(data?.transactions)
    ? `${data.count} parcelas criadas com sucesso.`
    : 'Transação criada com sucesso.'
  apiResponse.success(res, { data, message, statusCode: HTTP_STATUS.CREATED })
})

const update = asyncHandler(async (req, res) => {
  const data = await transactionService.updateTransaction(req.user.id, req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Transação atualizada com sucesso.' })
})

const remove = asyncHandler(async (req, res) => {
  await transactionService.deleteTransaction(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data: null, message: 'Transação excluída com sucesso.' })
})

const deletionPreview = asyncHandler(async (req, res) => {
  const data = await transactionService.getTransactionDeletionPreview(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data })
})

const getSummary = asyncHandler(async (req, res) => {
  const data = await transactionService.getFinancialSummary(req.user.id, req.validated.query)
  apiResponse.success(res, { data })
})

module.exports = { list, getById, deletionPreview, create, update, remove, getSummary }
