const os = require('os')
const config = require('../config')
const appInfo = require('../constants/appInfo')
const systemRepository = require('../repositories/system.repository')

const startedAt = Date.now()

function getApiInfo() {
  return {
    name: appInfo.NAME,
    description: appInfo.DESCRIPTION,
    version: appInfo.VERSION,
    environment: config.env,
  }
}

function getHealth() {
  const databaseConnected = systemRepository.ping()

  return {
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'unavailable',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  }
}

function getVersion() {
  return {
    version: appInfo.VERSION,
    node: process.version,
    environment: config.env,
  }
}

function getStatus() {
  const memory = process.memoryUsage()

  return {
    environment: config.env,
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
    platform: os.platform(),
    nodeVersion: process.version,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
    database: {
      path: config.database.path,
      connected: systemRepository.ping(),
    },
  }
}

module.exports = { getApiInfo, getHealth, getVersion, getStatus }
