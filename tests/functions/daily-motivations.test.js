import assert from 'node:assert/strict'
import test from 'node:test'

import { onRequest } from '../../functions/api/daily-motivations.js'

function createDb(records = [], locks = new Map()) {
  const rows = records.map(record => ({ ...record }))

  return {
    rows,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async all() {
              if (sql.includes('SELECT id, style, content, created_at')) {
                return {
                  results: rows
                    .filter(row => row.style === params[0])
                    .map(row => ({ ...row }))
                }
              }

              if (sql.includes('SELECT id FROM ai_daily_motivations')) {
                return {
                  results: rows
                    .filter(row => row.style === params[0])
                    .map(row => ({ id: row.id }))
                }
              }

              throw new Error(`Unexpected all query: ${sql}`)
            },
            async run() {
              if (sql.includes('INSERT INTO ai_daily_motivation_generation_locks')) {
                const [style, lockedUntil, now] = params
                const currentLock = locks.get(style)
                if (currentLock && currentLock > now) return { meta: { changes: 0 } }
                locks.set(style, lockedUntil)
                return { meta: { changes: 1 } }
              }

              if (sql.includes('INSERT OR IGNORE INTO ai_daily_motivations')) {
                const [id, style, content, createdAt] = params
                if (rows.some(row => row.style === style && row.content === content)) {
                  return { meta: { changes: 0 } }
                }
                rows.push({ id, style, content, created_at: createdAt })
                return { meta: { changes: 1 } }
              }

              if (sql.includes('DELETE FROM ai_daily_motivation_generation_locks')) {
                const [style, lockedUntil] = params
                if (locks.get(style) === lockedUntil) locks.delete(style)
                return { meta: { changes: 1 } }
              }

              throw new Error(`Unexpected run query: ${sql}`)
            }
          }
        }
      }
    }
  }
}

function request(method, body) {
  return new Request('https://youngbar.com/api/daily-motivations?style=%E5%8A%B1%E5%BF%97', {
    method,
    headers: {
      Origin: 'https://youngbar.com',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
}

function providerResponse(content) {
  return new Response(JSON.stringify({
    choices: [{ finish_reason: 'stop', message: { content } }]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

test('returns the shared pool without calling an AI provider', async () => {
  const db = createDb([{ id: 'one', style: '励志', content: '继续前进。', created_at: 1 }])
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('GET must not call an AI provider')

  try {
    const response = await onRequest({ request: request('GET'), env: { DB: db } })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(data.records, [{ id: 'one', style: '励志', content: '继续前进。', createdAt: 1 }])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects generation while a pool record has not been displayed', async () => {
  const db = createDb([{ id: 'one', style: '励志', content: '继续前进。', created_at: 1 }])
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('unexhausted pool must not generate')

  try {
    const response = await onRequest({
      request: request('POST', { style: '励志', count: 1, seenIds: [] }),
      env: { DB: db }
    })
    const data = await response.json()

    assert.equal(response.status, 409)
    assert.equal(data.error, 'pool_not_exhausted')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('generates and persists only after the current style pool is exhausted', async () => {
  const db = createDb([{ id: 'old', style: '励志', content: '继续前进。', created_at: 1 }])
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return providerResponse('新的第一条励志鸡汤文案\n新的第二条励志鸡汤文案\n新的第三条励志鸡汤文案\n新的第四条励志鸡汤文案')
  }

  try {
    const response = await onRequest({
      request: request('POST', { style: '励志', count: 2, seenIds: ['old'] }),
      env: { DB: db, AGNES_API_KEY: 'agnes-key', POLLINATIONS_API_KEY: 'pollinations-key' }
    })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.records.length, 2)
    assert.equal(data.storedCount, 4)
    assert.equal(db.rows.length, 5)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.model, 'agnes-2.0-flash')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('does not start a second provider request while a style generation lock is active', async () => {
  const futureLock = Date.now() + 60_000
  const db = createDb([], new Map([['励志', futureLock]]))
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('active lock must prevent generation')

  try {
    const response = await onRequest({
      request: request('POST', { style: '励志', count: 1, seenIds: [] }),
      env: { DB: db }
    })
    const data = await response.json()

    assert.equal(response.status, 409)
    assert.equal(data.error, 'generation_in_progress')
  } finally {
    globalThis.fetch = originalFetch
  }
})
