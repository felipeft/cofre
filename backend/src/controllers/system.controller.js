const systemService = require('../services/system.service')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

// GET /
const getRoot = asyncHandler(async (req, res) => {
  apiResponse.success(res, { data: systemService.getApiInfo() })
})

// GET /health
const getHealth = asyncHandler(async (req, res) => {
  const health = systemService.getHealth()
  const statusCode = health.status === 'ok' ? 200 : 503
  apiResponse.success(res, { data: health, statusCode })
})

// GET /version
const getVersion = asyncHandler(async (req, res) => {
  apiResponse.success(res, { data: systemService.getVersion() })
})

// GET /status
const getStatus = asyncHandler(async (req, res) => {
  apiResponse.success(res, { data: systemService.getStatus() })
})

module.exports = { getRoot, getHealth, getVersion, getStatus }
