import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { AuthMiddleware } from '../../functions/middlewares/auth.js'
import { onRequest as aiApps } from '../../functions/api/ai-apps.js'
import { onRequest as favorites } from '../../functions/api/favorite-apps.js'
import { onRequest as scenery } from '../../functions/api/user-season-scenery.js'
import { onRequest as qaDetail } from '../../functions/api/qa/[id].js'
import { onRequest as qaView } from '../../functions/api/qa-view/[id].js'
import { onRequest as links } from '../../functions/api/links.js'
import { onRequest as linkDetail } from '../../functions/api/links/[slug].js'

const origin = 'https://youngbar.com'
const secret = 'test-only-secret-for-access-control'
const appData = {
  title: 'Owner app', icon: 'test', description: 'Private app', category: 'general',
  gradient_from: 'blue-50', gradient_to: 'blue-100', border_color: 'blue-200',
  system_prompt: 'Private prompt'
}

function signToken(payload = {}, signingSecret = secret, header = { alg: 'HS256', typ: 'JWT' }) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const data = `${encode(header)}.${encode({
    uid: 'owner', exp: Math.floor(Date.now() / 1000) + 3600, ...payload
  })}`
  return `${data}.${createHmac('sha256', signingSecret).update(data).digest('base64url')}`
}

// Exercise the production SQL against SQLite, with the D1 result shape.
function createEnv(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  for (const migration of [
    '000_init_core_tables.sql', '001_create_short_links.sql', '005_create_ai_apps.sql',
    '008_create_user_season_scenery.sql', '016_create_favorite_apps.sql'
  ]) {
    sqlite.exec(readFileSync(new URL(`../../functions/db/${migration}`, import.meta.url), 'utf8'))
  }
  return {
    JWT_SECRET: secret,
    DB: {
      prepare(sql) {
        const statement = sqlite.prepare(sql)
        let params = []
        const query = {
          bind(...values) { params = values; return query },
          async first() { return statement.get(...params) || null },
          async all() { return { results: statement.all(...params) } },
          async run() {
            const result = statement.run(...params)
            return { success: true, meta: { changes: Number(result.changes) } }
          }
        }
        return query
      }
    }
  }
}

function request(path, method = 'GET', token, body) {
  const headers = { Origin: origin }
  if (token !== undefined) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return new Request(`${origin}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  })
}

async function seedApp(env, id = 'owner-app', uid = 'owner', type = 'custom') {
  await env.DB.prepare(`INSERT INTO ai_apps
    (id, name, icon, title, description, gradient_from, gradient_to, border_color,
     app_type, uid, system_prompt, create_time, update_time)
    VALUES (?, ?, 'test', ?, 'Private app', 'blue-50', 'blue-100', 'blue-200', ?, ?, ?, 'now', 'now')
  `).bind(id, id, appData.title, type, uid, appData.system_prompt).run()
}

async function seedLink(env, slug = 'owned-link', uid = 'owner') {
  await env.DB.prepare(`INSERT INTO short_links
    (id, slug, url, uid, create_time, update_time) VALUES (?, ?, 'https://example.com', ?, 'now', 'now')
  `).bind(slug, slug, uid).run()
}

async function seedQA(env, id = 'private-qa', isPublic = 0) {
  await env.DB.prepare(`INSERT INTO qa_pages (id, uid, title, qa_items, is_public)
    VALUES (?, 'owner', 'Private QA', ?, ?)
  `).bind(id, JSON.stringify([{ question: 'Private question', answer: 'Private answer' }]), isPublic).run()
}

test('JWT verification rejects invalid signatures, algorithms, identities and time claims', async t => {
  const now = Math.floor(Date.now() / 1000)
  t.mock.method(Date, 'now', () => now * 1000)
  const invalidTokens = [
    signToken({}, 'attacker-secret'), 'broken.token',
    signToken({}, secret, { alg: 'none' }),
    signToken({ uid: '' }), signToken({ uid: undefined }), signToken({ uid: 123 }),
    signToken({ exp: now }), signToken({ exp: now - 1 }),
    signToken({ exp: undefined }), signToken({ exp: String(now + 3600) }),
    signToken({ nbf: now + 3600 }), signToken({ nbf: 'invalid' })
  ]
  for (const token of invalidTokens) {
    const result = await AuthMiddleware.extractUserFromRequest(request('/api/links', 'GET', token), { JWT_SECRET: secret })
    assert.equal(result.success, false)
    const optional = await AuthMiddleware.extractUserFromRequestOptional(request('/api/links', 'GET', token), { JWT_SECRET: secret })
    assert.equal(optional.user, null)
  }
  const valid = await AuthMiddleware.extractUserFromRequest(request('/api/links', 'GET', signToken({ uid: '用户-owner', nbf: now })), { JWT_SECRET: secret })
  assert.equal(valid.success, true)
  assert.equal(valid.user.id, '用户-owner')
  assert.equal((await AuthMiddleware.extractUserFromRequest(request('/api/links', 'GET', signToken()), {})).success, false)
})

for (const [name, handler, path, method, body] of [
  ['AI app creation', aiApps, '/api/ai-apps', 'POST', appData],
  ['AI app update', aiApps, '/api/ai-apps?id=owner-app', 'PUT', appData],
  ['AI app deletion', aiApps, '/api/ai-apps?id=owner-app', 'DELETE'],
  ['AI app detail', aiApps, '/api/ai-apps?id=owner-app', 'GET'],
  ['favorite listing', favorites, '/api/favorite-apps', 'GET'],
  ['favorite creation', favorites, '/api/favorite-apps', 'POST', { app_id: 'owner-app' }],
  ['favorite deletion', favorites, '/api/favorite-apps?app_id=owner-app', 'DELETE'],
  ['scenery listing', scenery, '/api/user-season-scenery', 'GET'],
  ['scenery update', scenery, '/api/user-season-scenery', 'POST', { data: ['changed'] }]
]) {
  test(`${name} rejects anonymous and forged credentials before database access`, async () => {
    for (const token of [undefined, signToken({}, 'attacker-secret')]) {
      const response = await handler({ request: request(path, method, token, body), env: { JWT_SECRET: secret } })
      assert.equal(response.status, 401)
    }
  })
}

test('AI app lists keep system apps public and custom apps private', async t => {
  const env = createEnv(t)
  await seedApp(env)
  await seedApp(env, 'other-app', 'other')
  await seedApp(env, 'system-app', '', 'system')
  for (const token of [undefined, signToken({}, 'attacker-secret')]) {
    const response = await aiApps({ request: request('/api/ai-apps', 'GET', token), env })
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).data.map(app => app.id), ['system-app'])
  }
  const ownerList = await aiApps({ request: request('/api/ai-apps', 'GET', signToken()), env })
  assert.deepEqual(new Set((await ownerList.json()).data.map(app => app.id)), new Set(['system-app', 'owner-app']))
  const otherDetail = await aiApps({ request: request('/api/ai-apps?id=owner-app', 'GET', signToken({ uid: 'other' })), env })
  assert.equal(otherDetail.status, 404)
  const ownDetail = await aiApps({ request: request('/api/ai-apps?id=owner-app', 'GET', signToken()), env })
  assert.equal((await ownDetail.json()).data.system_prompt, appData.system_prompt)
})

test('AI app mutations bind the verified owner and cannot change another user\'s app', async t => {
  const env = createEnv(t)
  const created = await aiApps({ request: request('/api/ai-apps', 'POST', signToken(), { ...appData, uid: 'other' }), env })
  assert.equal(created.status, 200)
  const { id } = (await created.json()).data
  assert.equal((await env.DB.prepare('SELECT uid FROM ai_apps WHERE id = ?').bind(id).first()).uid, 'owner')
  await aiApps({ request: request(`/api/ai-apps?id=${id}`, 'PUT', signToken({ uid: 'other' }), { ...appData, title: 'stolen' }), env })
  await aiApps({ request: request(`/api/ai-apps?id=${id}`, 'DELETE', signToken({ uid: 'other' })), env })
  assert.equal((await env.DB.prepare('SELECT title FROM ai_apps WHERE id = ?').bind(id).first()).title, appData.title)
  await aiApps({ request: request(`/api/ai-apps?id=${id}`, 'PUT', signToken(), { ...appData, title: 'Updated' }), env })
  assert.equal((await env.DB.prepare('SELECT title FROM ai_apps WHERE id = ?').bind(id).first()).title, 'Updated')
  await aiApps({ request: request(`/api/ai-apps?id=${id}`, 'DELETE', signToken()), env })
  assert.equal(await env.DB.prepare('SELECT id FROM ai_apps WHERE id = ?').bind(id).first(), null)
})

test('favorites use verified identity for reading, adding and deleting', async t => {
  const env = createEnv(t)
  await seedApp(env)
  const saved = await favorites({ request: request('/api/favorite-apps', 'POST', signToken(), { app_id: 'owner-app', uid: 'other' }), env })
  assert.equal(saved.status, 200)
  const otherSave = await favorites({ request: request('/api/favorite-apps', 'POST', signToken({ uid: 'other' }), { app_id: 'owner-app' }), env })
  assert.equal(otherSave.status, 403)
  const ownList = await favorites({ request: request('/api/favorite-apps', 'GET', signToken()), env })
  assert.equal((await ownList.json()).data[0].app_id, 'owner-app')
  const otherList = await favorites({ request: request('/api/favorite-apps?ids=1', 'GET', signToken({ uid: 'other' })), env })
  assert.deepEqual((await otherList.json()).data, [])
  await favorites({ request: request('/api/favorite-apps?app_id=owner-app', 'DELETE', signToken({ uid: 'other' })), env })
  assert.ok(await env.DB.prepare('SELECT id FROM user_favorite_apps').first())
  await favorites({ request: request('/api/favorite-apps?app_id=owner-app', 'DELETE', signToken()), env })
  assert.equal(await env.DB.prepare('SELECT id FROM user_favorite_apps').first(), null)
})

test('scenery reads and writes stay within the verified user', async t => {
  const env = createEnv(t)
  for (const uid of ['owner', 'other']) {
    const response = await scenery({ request: request('/api/user-season-scenery', 'POST', signToken({ uid }), { data: [uid], uid: 'owner' }), env })
    assert.equal(response.status, 200)
  }
  const response = await scenery({ request: request('/api/user-season-scenery', 'POST', signToken(), { data: ['updated'], uid: 'other' }), env })
  assert.equal(response.status, 200)
  for (const [uid, expected] of [['owner', ['updated']], ['other', ['other']]]) {
    const result = await scenery({ request: request('/api/user-season-scenery', 'GET', signToken({ uid })), env })
    assert.deepEqual((await result.json()).data, expected)
  }
})

test('private QA details require a verified owner; public sharing remains available', async t => {
  t.mock.method(console, 'log', () => {})
  const env = createEnv(t)
  await seedQA(env)
  await seedQA(env, 'public-qa', 1)
  for (const token of [undefined, signToken({}, 'attacker-secret')]) {
    const response = await qaDetail({ request: request('/api/qa/private-qa', 'GET', token), env })
    assert.equal(response.status, 401)
  }
  const other = await qaDetail({ request: request('/api/qa/private-qa', 'GET', signToken({ uid: 'other' })), env })
  assert.equal(other.status, 403)
  assert.doesNotMatch(await other.text(), /Private question|Private answer/)
  const own = await qaDetail({ request: request('/api/qa/private-qa', 'GET', signToken()), env })
  assert.equal(own.status, 200)
  assert.equal((await own.json()).qaItems[0].answer, 'Private answer')
  assert.equal((await qaView({ request: request('/api/qa-view/private-qa'), env })).status, 404)
  assert.equal((await qaView({ request: request('/api/qa-view/public-qa'), env })).status, 200)
})

test('short links bind logged-in creation to the token and expose it in the owner list', async t => {
  const env = createEnv(t)
  const response = await links({ request: request('/api/links', 'POST', signToken(), {
    url: 'https://example.com', slug: 'new-link', uid: 'other'
  }), env })
  assert.equal(response.status, 201)
  assert.equal((await env.DB.prepare('SELECT uid FROM short_links').first()).uid, 'owner')
  const ownList = await links({ request: request('/api/links', 'GET', signToken()), env })
  assert.deepEqual((await ownList.json()).data.map(link => link.slug), ['new-link'])
  const otherList = await links({ request: request('/api/links', 'GET', signToken({ uid: 'other' })), env })
  assert.deepEqual((await otherList.json()).data, [])
})

test('anonymous short-link creation stays available without trusting a supplied uid', async t => {
  const env = createEnv(t)
  const response = await links({ request: request('/api/links', 'POST', undefined, {
    url: 'https://example.com', slug: 'anonymous-link', uid: 'owner'
  }), env })
  assert.equal(response.status, 201)
  assert.equal((await env.DB.prepare('SELECT uid FROM short_links').first()).uid, '')
  const show = await linkDetail({ request: request('/api/links/anonymous-link'), env })
  assert.equal(show.status, 200)
  const denied = await linkDetail({ request: request('/api/links/anonymous-link', 'DELETE', signToken()), env })
  assert.equal(denied.status, 404)
  assert.ok(await env.DB.prepare('SELECT id FROM short_links').first())
})

test('short-link deletion requires the owner and reports missing or foreign records as failures', async t => {
  const env = createEnv(t)
  await seedLink(env)
  for (const [token, status] of [
    [undefined, 401], [signToken({}, 'attacker-secret'), 401], [signToken({ uid: 'other' }), 404]
  ]) {
    const response = await linkDetail({ request: request('/api/links/owned-link', 'DELETE', token), env })
    assert.equal(response.status, status)
    assert.ok(await env.DB.prepare('SELECT id FROM short_links').first())
  }
  const deleted = await linkDetail({ request: request('/api/links/owned-link', 'DELETE', signToken()), env })
  assert.equal(deleted.status, 200)
  assert.equal(await env.DB.prepare('SELECT id FROM short_links').first(), null)
  const missing = await linkDetail({ request: request('/api/links/owned-link', 'DELETE', signToken()), env })
  assert.equal(missing.status, 404)
})

test('short-link creation rejects an invalid provided token instead of silently losing ownership', async t => {
  const env = createEnv(t)
  const response = await links({ request: request('/api/links', 'POST', signToken({}, 'attacker-secret'), { url: 'https://example.com' }), env })
  assert.equal(response.status, 401)
  assert.equal(await env.DB.prepare('SELECT id FROM short_links').first(), null)
})

test('short-link database errors do not report a successful deletion', async t => {
  t.mock.method(console, 'error', () => {})
  const response = await linkDetail({
    request: request('/api/links/owned-link', 'DELETE', signToken()),
    env: { JWT_SECRET: secret, DB: { prepare() { throw new Error('unavailable') } } }
  })
  assert.equal(response.status, 500)
})
