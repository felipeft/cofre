const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-settings-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase } = require('../src/database/connection')
const { createTestUser, asUser } = require('./helpers/userScope')

const settingsA = asUser(require('../src/services/settings.service'), 1)
const settingsB = asUser(require('../src/services/settings.service'), 2)

before(async () => {
  await ensureDatabaseReady()
  await createTestUser({ id: 1 })
  await createTestUser({ id: 2 })
})

after(async () => {
  await closeDatabase()
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true })
})

test('preferência de tema nasce com o default do sistema', async () => {
  assert.equal((await settingsA.getSettings()).theme, 'system')
  assert.equal((await settingsB.getSettings()).theme, 'system')
})

test('alteração de aparência é persistida e isolada por usuário', async () => {
  await settingsA.updateSettings({ theme: 'dark' })
  assert.equal((await settingsA.getSettings()).theme, 'dark')
  assert.equal((await settingsB.getSettings()).theme, 'system')
})
