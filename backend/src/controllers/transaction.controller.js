const transactionService = require('../services/transaction.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const HTTP_STATUS = require('../constants/httpStatus')

const list = asyncHandler(async (req, res) => {
  const { data, meta } = transactionService.listTransactions(req.validated.query)
  apiResponse.success(res, { data, meta })
})

const getById = asyncHandler(async (req, res) => {
  const data = transactionService.getTransactionById(req.validated.params.id)
  apiResponse.success(res, { data })
})

const create = asyncHandler(async (req, res) => {
  const data = transactionService.createTransaction(req.validated.body)
  apiResponse.success(res, { data, message: 'Transação criada com sucesso.', statusCode: HTTP_STATUS.CREATED })
})

const update = asyncHandler(async (req, res) => {
  const data = transactionService.updateTransaction(req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Transação atualizada com sucesso.' })
})

const remove = asyncHandler(async (req, res) => {
  transactionService.deleteTransaction(req.validated.params.id)
  apiResponse.success(res, { data: null, message: 'Transação excluída com sucesso.' })
})

module.exports = { list, getById, create, update, remove }
