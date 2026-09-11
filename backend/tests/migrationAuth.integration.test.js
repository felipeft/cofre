const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createClient } = require('@libsql/client')

test('migration de autenticação preserva integralmente dados da Etapa 9', async () => {
  const dbPath = path.join(os.tmpdir(), `cofre-migration-auth-${process.pid}-${Date.now()}.db`)
  const migrations = path.join(__dirname, '../src/database/migrations')
  const db = createClient({ url: `file:${dbPath}`, intMode: 'number' })
  try {
    await db.execute('PRAGMA foreign_keys = ON')
    for (let number = 1; number <= 8; number += 1) {
      const name = fs.readdirSync(migrations).find((file) => file.startsWith(String(number).padStart(4, '0')))
      await db.executeMultiple(fs.readFileSync(path.join(migrations, name), 'utf8'))
    }
    const categoryId = Number((await db.execute("INSERT INTO categories (name, type, color, icon) VALUES ('Legada', 'expense', '#fff', 'Tag')")).lastInsertRowid)
    const cardId = Number((await db.execute("INSERT INTO credit_cards (name, credit_limit, closing_day, due_day) VALUES ('Legado', 1000, 10, 20)")).lastInsertRowid)
    const transactionId = Number((await db.execute({ sql: `INSERT INTO transactions (description, amount, type, category_id, date, competence_month, competence_year, card_id) VALUES ('Compra legada', 10, 'expense', ?, '2030-01-01', 1, 2030, ?)`, args: [categoryId, cardId] })).lastInsertRowid)

    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0009_add_authentication_and_user_ownership.sql'), 'utf8'))

    const userId = Number((await db.execute("INSERT INTO users (google_sub, email, name) VALUES ('existing-sub', 'existing@example.com', 'Existing')")).lastInsertRowid)
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0010_create_user_settings.sql'), 'utf8'))

    const category = (await db.execute({ sql: 'SELECT id, name, user_id FROM categories WHERE id = ?', args: [categoryId] })).rows[0]
    const transaction = (await db.execute({ sql: 'SELECT id, description, user_id FROM transactions WHERE id = ?', args: [transactionId] })).rows[0]
    assert.deepEqual({ ...category }, { id: categoryId, name: 'Legada', user_id: null })
    assert.deepEqual({ ...transaction }, { id: transactionId, description: 'Compra legada', user_id: null })
    assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length, 0)
    const settings = (await db.execute({ sql: 'SELECT default_offer_rate, default_tithe_rate FROM user_settings WHERE user_id = ?', args: [userId] })).rows[0]
    assert.deepEqual({ ...settings }, { default_offer_rate: 0.01, default_tithe_rate: 0.1 })
  } finally {
    db.close()
    for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${dbPath}${suffix}`, { force: true })
  }
})
