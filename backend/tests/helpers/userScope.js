const { getDatabase } = require('../../src/database/connection')

async function createTestUser({ id, email = `user${id}@example.com`, googleSub = `google-${id}`, name = `User ${id}` }) {
  await getDatabase().prepare('INSERT INTO users (id, google_sub, email, name) VALUES (?, ?, ?, ?)').run(id, googleSub, email, name)
  return id
}

function asUser(module, userId) {
  return new Proxy(module, {
    get(target, property) {
      const value = target[property]
      return typeof value === 'function' ? (...args) => value(userId, ...args) : value
    },
  })
}

module.exports = { createTestUser, asUser }
