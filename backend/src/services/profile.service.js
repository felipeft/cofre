const profileRepository = require('../repositories/profile.repository')
const { mapProfileRow } = require('../utils/mappers/profile.mapper')
const NotFoundError = require('../errors/NotFoundError')

async function getProfile(userId) {
  const row = await profileRepository.findById(userId)
  if (!row) throw new NotFoundError('Perfil não encontrado.')
  return mapProfileRow(row)
}

async function updateProfile(userId, { displayName }) {
  await getProfile(userId)
  return mapProfileRow(await profileRepository.updateDisplayName(userId, displayName ?? null))
}

module.exports = { getProfile, updateProfile }
