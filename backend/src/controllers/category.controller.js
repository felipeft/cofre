const categoryService = require('../services/category.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const HTTP_STATUS = require('../constants/httpStatus')

const list = asyncHandler(async (req, res) => {
  const data = await categoryService.listCategories(req.user.id, req.validated.query)
  apiResponse.success(res, { data })
})

const getById = asyncHandler(async (req, res) => {
  const data = await categoryService.getCategoryById(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data })
})

const create = asyncHandler(async (req, res) => {
  const data = await categoryService.createCategory(req.user.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Categoria criada com sucesso.', statusCode: HTTP_STATUS.CREATED })
})

const update = asyncHandler(async (req, res) => {
  const data = await categoryService.updateCategory(req.user.id, req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Categoria atualizada com sucesso.' })
})

const remove = asyncHandler(async (req, res) => {
  const { category } = await categoryService.deleteCategory(req.user.id, req.validated.params.id)
  apiResponse.success(res, { data: { category }, message: 'Categoria excluída com sucesso.' })
})

module.exports = { list, getById, create, update, remove }
