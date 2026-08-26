import assert from 'node:assert/strict'
import test from 'node:test'

import { onRequest } from '../../functions/api/daily-motivations.js'

function createDb(records = [], locks = new Map(), options = {}) {
  const rows = records.map(record => ({ ...record }))
  const rateLimits = new Map()

  return {
    rows,
    rateLimits,
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
                options.onLockAcquired?.(rows)
                return { meta: { changes: 1 } }
              }

              if (sql.includes('INSERT INTO ai_daily_motivation_generation_rate_limits')) {
                const [clientKey, windowStartedAt, updatedAt, maxCount] = params
                const current = rateLimits.get(clientKey)

                if (current?.windowStartedAt === windowStartedAt && current.count >= maxCount) {
                  return { meta: { changes: 0 } }
                }

                rateLimits.set(clientKey, {
                  windowStartedAt,
                  count: current?.windowStartedAt === windowStartedAt
                    ? current.count + 1
                    : 1,
                  updatedAt
                })
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

              if (sql.includes('DELETE FROM ai_daily_motivation_generation_rate_limits')) {
                const [cutoff] = params
                let changes = 0
                for (const [clientKey, rateLimit] of rateLimits.entries()) {
                  if (rateLimit.updatedAt < cutoff) {
                    rateLimits.delete(clientKey)
                    changes += 1
                  }
                }
                return { meta: { changes } }
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
      env: { DB: db, AGNES_API_KEY: 'agnes-key' }
    })
    const data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.records.length, 2)
    assert.equal(data.storedCount, 4)
    assert.equal(db.rows.length, 5)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].body.model, 'agnes-2.5-flash')
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

test('rechecks the pool after acquiring the style lock', async () => {
  const db = createDb(
    [{ id: 'old', style: '励志', content: '继续前进。', created_at: 1 }],
    new Map(),
    {
      onLockAcquired(rows) {
        rows.push({
          id: 'concurrent',
          style: '励志',
          content: '另一个请求刚刚补充的新内容。',
          created_at: 2
        })
      }
    }
  )
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('a replenished pool must not generate')

  try {
    const response = await onRequest({
      request: request('POST', { style: '励志', count: 1, seenIds: ['old'] }),
      env: { DB: db }
    })
    const data = await response.json()

    assert.equal(response.status, 409)
    assert.equal(data.error, 'pool_not_exhausted')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('limits generation to three batches per client in ten minutes', async () => {
  const db = createDb()
  const originalFetch = globalThis.fetch
  let providerCalls = 0

  globalThis.fetch = async () => {
    providerCalls += 1
    return providerResponse(`第${providerCalls}批新的第一条励志鸡汤文案\n第${providerCalls}批新的第二条励志鸡汤文案`)
  }

  try {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await onRequest({
        request: request('POST', {
          style: '励志',
          count: 1,
          seenIds: db.rows.map(row => row.id)
        }),
        env: { DB: db, AGNES_API_KEY: 'agnes-key' }
      })
      const data = await response.json()

      if (attempt <= 3) {
        assert.equal(response.status, 200)
      } else {
        assert.equal(response.status, 429)
        assert.equal(data.error, 'generation_rate_limited')
        assert.ok(Number(response.headers.get('Retry-After')) > 0)
      }
    }

    assert.equal(providerCalls, 3)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects an excessive number of seen IDs', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('invalid input must not call an AI provider')

  try {
    const response = await onRequest({
      request: request('POST', {
        style: '励志',
        count: 1,
        seenIds: Array.from({ length: 10001 }, (_, index) => `id-${index}`)
      }),
      env: { DB: createDb() }
    })
    const data = await response.json()

    assert.equal(response.status, 400)
    assert.match(data.error, /at most 10000/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects an excessively long seen ID', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => assert.fail('invalid input must not call an AI provider')

  try {
    const response = await onRequest({
      request: request('POST', {
        style: '励志',
        count: 1,
        seenIds: ['x'.repeat(65)]
      }),
      env: { DB: createDb() }
    })
    const data = await response.json()

    assert.equal(response.status, 400)
    assert.match(data.error, /at most 64 characters/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
