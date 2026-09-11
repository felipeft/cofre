const cardService = require('../services/card.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const HTTP_STATUS = require('../constants/httpStatus')

const list = asyncHandler(async (req, res) => {
  const data = await cardService.listCards(req.user.id, req.validated.query)
  apiResponse.success(res, { data })
})

const getById = asyncHandler(async (req, res) => {
  const data = await cardService.getCardById(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data })
})

const create = asyncHandler(async (req, res) => {
  const data = await cardService.createCard(req.user.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Cartão criado com sucesso.', statusCode: HTTP_STATUS.CREATED })
})

const update = asyncHandler(async (req, res) => {
  const data = await cardService.updateCard(req.user.id, req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Cartão atualizado com sucesso.' })
})

const remove = asyncHandler(async (req, res) => {
  const { card } = await cardService.deleteCard(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data: { card }, message: 'Cartão excluído com sucesso.' })
})

const getSummary = asyncHandler(async (req, res) => {
  const data = await cardService.getCardSummary(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data })
})

const registerPayment = asyncHandler(async (req, res) => {
  const data = await cardService.registerPayment(req.user.id, req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Pagamento da fatura registrado com sucesso.', statusCode: HTTP_STATUS.CREATED })
})

module.exports = { list, getById, create, update, remove, getSummary, registerPayment }
