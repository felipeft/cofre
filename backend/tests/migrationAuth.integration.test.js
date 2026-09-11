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
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0011_create_google_sheets_integrations.sql'), 'utf8'))
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0012_create_google_sheets_sync_runs.sql'), 'utf8'))
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0013_add_theme_to_user_settings.sql'), 'utf8'))
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0014_simplify_financial_model.sql'), 'utf8'))
    await db.executeMultiple(fs.readFileSync(path.join(migrations, '0015_optimize_recurring_and_data_management.sql'), 'utf8'))

    const category = (await db.execute({ sql: 'SELECT id, name, user_id FROM categories WHERE id = ?', args: [categoryId] })).rows[0]
    const transaction = (await db.execute({ sql: 'SELECT id, description, user_id FROM transactions WHERE id = ?', args: [transactionId] })).rows[0]
    assert.deepEqual({ ...category }, { id: categoryId, name: 'Legada', user_id: null })
    assert.deepEqual({ ...transaction }, { id: transactionId, description: 'Compra legada', user_id: null })
    assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length, 0)
    const settings = (await db.execute({ sql: 'SELECT theme FROM user_settings WHERE user_id = ?', args: [userId] })).rows[0]
    assert.deepEqual({ ...settings }, { theme: 'system' })
    const categoryColumns = (await db.execute('PRAGMA table_info(categories)')).rows.map((column) => column.name)
    const transactionColumns = (await db.execute('PRAGMA table_info(transactions)')).rows.map((column) => column.name)
    const settingsColumns = (await db.execute('PRAGMA table_info(user_settings)')).rows.map((column) => column.name)
    assert.equal(categoryColumns.length, 10)
    assert.equal(transactionColumns.length, 23)
    assert.equal(settingsColumns.length, 4)
    const integrationTables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('google_sheets_integrations', 'google_sheets_oauth_attempts', 'google_sheets_imports')")
    assert.equal(integrationTables.rows.length, 3)
    const syncTable = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'google_sheets_sync_runs'")
    assert.equal(syncTable.rows.length, 1)
    const recurringColumns = (await db.execute('PRAGMA table_info(recurring_expenses)')).rows.map((column) => column.name)
    const integrationColumns = (await db.execute('PRAGMA table_info(google_sheets_integrations)')).rows.map((column) => column.name)
    assert.ok(recurringColumns.includes('generated_through'))
    assert.ok(integrationColumns.includes('requires_full_export'))
    assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length, 0)
  } finally {
    db.close()
    for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${dbPath}${suffix}`, { force: true })
  }
})
