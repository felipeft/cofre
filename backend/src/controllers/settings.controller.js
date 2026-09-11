const settingsService = require('../services/settings.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const get = asyncHandler(async (req, res) => {
  apiResponse.success(res, { data: await settingsService.getSettings(req.user.id) })
})

const update = asyncHandler(async (req, res) => {
  const data = await settingsService.updateSettings(req.user.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Preferências atualizadas com sucesso.' })
})

module.exports = { get, update }
