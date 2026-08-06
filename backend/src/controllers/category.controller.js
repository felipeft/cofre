const categoryService = require('../services/category.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')
const HTTP_STATUS = require('../constants/httpStatus')

const list = asyncHandler(async (req, res) => {
  const data = categoryService.listCategories(req.validated.query)
  apiResponse.success(res, { data })
})

const getById = asyncHandler(async (req, res) => {
  const data = categoryService.getCategoryById(req.validated.params.id)
  apiResponse.success(res, { data })
})

const create = asyncHandler(async (req, res) => {
  const data = categoryService.createCategory(req.validated.body)
  apiResponse.success(res, { data, message: 'Categoria criada com sucesso.', statusCode: HTTP_STATUS.CREATED })
})

const update = asyncHandler(async (req, res) => {
  const data = categoryService.updateCategory(req.validated.params.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Categoria atualizada com sucesso.' })
})

const remove = asyncHandler(async (req, res) => {
  const { category, softDeleted } = categoryService.deleteCategory(req.validated.params.id)

  const message = softDeleted
    ? 'Categoria em uso: desativada em vez de excluída.'
    : 'Categoria excluída com sucesso.'

  apiResponse.success(res, { data: { softDeleted, category }, message })
})

module.exports = { list, getById, create, update, remove }
