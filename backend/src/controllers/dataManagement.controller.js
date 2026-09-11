const service = require('../services/dataManagement.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const preview = asyncHandler(async (req, res) => apiResponse.success(res, {
  data: await service.getPreview(req.user.id, req.validated.query.operation),
}))

const clearRecords = asyncHandler(async (req, res) => apiResponse.success(res, {
  data: await service.clearFinancialRecords(req.user.id),
  message: 'Todos os registros financeiros foram removidos.',
}))

const reset = asyncHandler(async (req, res) => apiResponse.success(res, {
  data: await service.resetCofre(req.user.id),
  message: 'Os dados financeiros do Cofre foram resetados.',
}))

module.exports = { preview, clearRecords, reset }
