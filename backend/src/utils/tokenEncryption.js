const crypto = require('crypto')
const config = require('../config')

const VERSION = 'v1'

function key() {
  if (!config.googleSheets.tokenEncryptionKey) throw new Error('Criptografia da integração Google não configurada.')
  const decoded = Buffer.from(config.googleSheets.tokenEncryptionKey, 'base64')
  if (decoded.length !== 32) throw new Error('Chave de criptografia Google inválida.')
  return decoded
}

function encryptToken(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.')
}

function decryptToken(payload) {
  const [version, iv, tag, ciphertext] = String(payload || '').split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('Token criptografado inválido.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}

module.exports = { encryptToken, decryptToken }
