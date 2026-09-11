const settingsRepository = require('../repositories/settings.repository')
const { mapSettingsRow } = require('../utils/mappers/settings.mapper')

async function getSettings(userId) {
  return mapSettingsRow(await settingsRepository.findByUserId(userId))
}

async function updateSettings(userId, patch) {
  return mapSettingsRow(await settingsRepository.update(userId, patch))
}

module.exports = { getSettings, updateSettings }
