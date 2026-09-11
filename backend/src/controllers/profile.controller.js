const profileService = require('../services/profile.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const get = asyncHandler(async (req, res) => {
  apiResponse.success(res, { data: await profileService.getProfile(req.user.id) })
})

const update = asyncHandler(async (req, res) => {
  const data = await profileService.updateProfile(req.user.id, req.validated.body)
  apiResponse.success(res, { data, message: 'Perfil atualizado com sucesso.' })
})

module.exports = { get, update }
