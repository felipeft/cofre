const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { once } = require('node:events')

const TEST_DB_PATH = path.join(os.tmpdir(), `cofre-test-auth-${process.pid}-${Date.now()}.db`)
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = TEST_DB_PATH
process.env.LOG_LEVEL = 'error'
process.env.FRONTEND_URLS = 'http://localhost:5173'
process.env.GOOGLE_CLIENT_ID = 'test-client'
process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/api/auth/google/callback'
process.env.AUTH_ALLOWED_EMAILS = 'felipeflw11@gmail.com,user-b@gmail.com'
process.env.AUTH_LEGACY_OWNER_EMAIL = 'felipeflw11@gmail.com'
process.env.SESSION_SECRET = 'test-session-secret-with-sufficient-entropy'

const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const app = require('../src/app')
const { ensureDatabaseReady } = require('../src/database/bootstrap')
const { closeDatabase, getDatabase } = require('../src/database/connection')
const authService = require('../src/services/auth.service')

let server
let baseUrl
const nonceByState = new Map()

function identityFor(code) {
  if (code === 'outside') return { sub: 'outside-sub', email: 'outside@gmail.com', email_verified: true, name: 'Outside' }
  if (code === 'user-b') return { sub: 'user-b-sub', email: 'user-b@gmail.com', email_verified: true, name: 'User B' }
  return { sub: 'felipe-sub', email: 'FelipeFLW11@gmail.com', email_verified: true, name: 'Felipe', picture: 'https://example.com/avatar.png' }
}

async function beginAndCallback(code = 'allowed') {
  const begin = await fetch(`${baseUrl}/auth/google`, { redirect: 'manual' })
  const stateCookie = begin.headers.get('set-cookie').split(';')[0]
  const state = new URL(begin.headers.get('location')).searchParams.get('state')
  const callback = await fetch(`${baseUrl}/auth/google/callback?code=${code}&state=${encodeURIComponent(state)}`, {
    redirect: 'manual', headers: { Cookie: stateCookie },
  })
  const sessionMatch = callback.headers.get('set-cookie')?.match(/cofre_session=([^;,]+)/)
  return { callback, sessionCookie: sessionMatch ? `cofre_session=${sessionMatch[1]}` : null }
}

async function api(pathname, { cookie, method = 'GET', body } = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

before(async () => {
  await ensureDatabaseReady()
  authService.setGoogleProviderForTests({
    createAuthorizationUrl: ({ state, nonce }) => {
      nonceByState.set(state, nonce)
      return `https://accounts.google.test/auth?state=${encodeURIComponent(state)}`
    },
    exchangeCode: async ({ code }) => {
      const nonce = [...nonceByState.values()].at(-1)
      return { ...identityFor(code), nonce }
    },
  })
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await closeDatabase()
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${TEST_DB_PATH}${suffix}`, { force: true })
})

describe('Google OAuth e sessão persistente', () => {
  test('usuário permitido autentica e /auth/me retorna apenas o perfil público', async () => {
    const { callback, sessionCookie } = await beginAndCallback()
    assert.equal(callback.status, 302)
    assert.ok(sessionCookie)
    assert.match(callback.headers.get('set-cookie'), /HttpOnly/i)
    const response = await api('/auth/me', { cookie: sessionCookie })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.data.authenticated, true)
    assert.equal(body.data.user.email, 'felipeflw11@gmail.com')
    assert.equal('googleSub' in body.data.user, false)
  })

  test('e-mail fora da whitelist é rejeitado e não recebe sessão', async () => {
    const { callback, sessionCookie } = await beginAndCallback('outside')
    assert.equal(callback.status, 302)
    assert.match(callback.headers.get('location'), /auth_error=not_allowed/)
    assert.equal(sessionCookie, null)
  })

  test('rota protegida rejeita sessão ausente, inválida e expirada', async () => {
    assert.equal((await api('/categories')).status, 401)
    assert.equal((await api('/integrations/google-sheets')).status, 401)
    assert.equal((await api('/integrations/google-sheets/sync')).status, 401)
    assert.equal((await api('/integrations/google-sheets/callback?code=x&state=y')).status, 401)
    assert.equal((await api('/categories', { cookie: 'cofre_session=invalid' })).status, 401)
    const expiredToken = 'expired-token'
    const user = await getDatabase().prepare("SELECT id FROM users WHERE email = 'felipeflw11@gmail.com'").get()
    await getDatabase().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '-1 minute'))")
      .run(crypto.createHash('sha256').update(expiredToken).digest('hex'), user.id)
    assert.equal((await api('/categories', { cookie: `cofre_session=${expiredToken}` })).status, 401)
  })

  test('logout invalida a sessão persistida e expira o cookie', async () => {
    const { sessionCookie } = await beginAndCallback()
    assert.equal((await api('/categories', { cookie: sessionCookie })).status, 200)
    const logout = await api('/auth/logout', { cookie: sessionCookie, method: 'POST' })
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
    assert.equal((await api('/categories', { cookie: sessionCookie })).status, 401)
  })
})

describe('isolamento de dados por usuário', () => {
  test('nomes iguais coexistem, mas GET/PUT/DELETE cruzados não acessam o recurso', async () => {
    const a = (await beginAndCallback('allowed')).sessionCookie
    const b = (await beginAndCallback('user-b')).sessionCookie
    const category = { name: 'Mercado privado', type: 'expense', color: '#f2666a', icon: 'ShoppingCart', isActive: true, sortOrder: 0, applyOffer: false, offerRate: null, applyTithe: false, titheRate: null }
    const createdAResponse = await api('/categories', { cookie: a, method: 'POST', body: category })
    assert.equal(createdAResponse.status, 201)
    const createdA = (await createdAResponse.json()).data
    assert.equal((await api('/categories', { cookie: b, method: 'POST', body: category })).status, 201)
    assert.equal((await api(`/categories/${createdA.id}`, { cookie: b })).status, 404)
    assert.equal((await api(`/categories/${createdA.id}`, { cookie: b, method: 'PUT', body: { name: 'Invadida' } })).status, 404)
    assert.equal((await api(`/categories/${createdA.id}`, { cookie: b, method: 'DELETE' })).status, 404)
    assert.equal((await api(`/categories/${createdA.id}`, { cookie: a })).status, 200)

    const card = { name: 'PicPay compartilhável', creditLimit: 1000, closingDay: 10, dueDay: 20, isActive: true }
    assert.equal((await api('/cards', { cookie: a, method: 'POST', body: card })).status, 201)
    assert.equal((await api('/cards', { cookie: b, method: 'POST', body: card })).status, 201)

    const transaction = { description: 'Privada A', amount: 25, type: 'expense', categoryId: createdA.id, date: '2030-01-10', notes: '', source: 'manual', isRecurring: false, isFixed: false, tags: [], status: 'confirmed' }
    const txResponse = await api('/transactions', { cookie: a, method: 'POST', body: transaction })
    assert.equal(txResponse.status, 201)
    const tx = (await txResponse.json()).data
    assert.equal((await api(`/transactions/${tx.id}`, { cookie: b })).status, 404)
    assert.equal((await api(`/transactions/${tx.id}`, { cookie: b, method: 'PUT', body: { amount: 99 } })).status, 404)
    assert.equal((await api(`/transactions/${tx.id}`, { cookie: b, method: 'DELETE' })).status, 404)
  })
})

describe('perfil e configurações do usuário atual', () => {
  test('rotas exigem autenticação e nunca recebem userId na URL', async () => {
    assert.equal((await api('/settings')).status, 401)
    assert.equal((await api('/profile')).status, 401)
    const cookie = (await beginAndCallback('allowed')).sessionCookie
    assert.equal((await api('/users/1/settings', { cookie })).status, 404)
  })

  test('dois usuários recebem e atualizam somente suas próprias preferências', async () => {
    const a = (await beginAndCallback('allowed')).sessionCookie
    const b = (await beginAndCallback('user-b')).sessionCookie
    const defaultsA = await (await api('/settings', { cookie: a })).json()
    const defaultsB = await (await api('/settings', { cookie: b })).json()
    assert.equal(defaultsA.data.defaultOfferRate, 0.01)
    assert.equal(defaultsB.data.defaultOfferRate, 0.01)
    assert.equal(defaultsA.data.theme, 'system')
    assert.equal(defaultsB.data.theme, 'system')

    const updated = await api('/settings', { cookie: a, method: 'PATCH', body: { defaultOfferRate: 0.025, theme: 'dark' } })
    assert.equal(updated.status, 200)
    const updatedData = (await updated.json()).data
    assert.equal(updatedData.defaultTitheRate, 0.1, 'PATCH parcial preserva a outra taxa')
    assert.equal(updatedData.theme, 'dark')
    const untouchedB = (await (await api('/settings', { cookie: b })).json()).data
    assert.equal(untouchedB.defaultOfferRate, 0.01)
    assert.equal(untouchedB.theme, 'system')
  })

  test('perfil permite somente displayName e /auth/me reflete a alteração', async () => {
    const cookie = (await beginAndCallback('allowed')).sessionCookie
    const updated = await api('/profile', { cookie, method: 'PATCH', body: { displayName: 'Felipe no Cofre' } })
    assert.equal(updated.status, 200)
    assert.equal((await updated.json()).data.displayName, 'Felipe no Cofre')

    const forbiddenMassAssignment = await api('/profile', { cookie, method: 'PATCH', body: { email: 'attacker@example.com' } })
    assert.equal(forbiddenMassAssignment.status, 400)
    const me = await (await api('/auth/me', { cookie })).json()
    assert.equal(me.data.user.name, 'Felipe no Cofre')
    assert.equal(me.data.user.email, 'felipeflw11@gmail.com')
    assert.equal(me.data.user.provider, 'google')
    assert.ok(me.data.user.session.createdAt)
    assert.ok(me.data.user.session.expiresAt)
  })

  test('payload financeiro inválido é rejeitado', async () => {
    const cookie = (await beginAndCallback('allowed')).sessionCookie
    assert.equal((await api('/settings', { cookie, method: 'PATCH', body: { defaultOfferRate: 1.5 } })).status, 400)
    assert.equal((await api('/settings', { cookie, method: 'PATCH', body: { theme: 'sepia' } })).status, 400)
    assert.equal((await api('/settings', { cookie, method: 'PATCH', body: { userId: 2 } })).status, 400)
  })
})
