import assert from 'node:assert/strict'
import test from 'node:test'

import { onRequest } from '../../functions/cron/clean-chat.js'

const SUPABASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_KEY: 'service-key',
  CRON_SECRET: 'cron-secret'
}

function request(method = 'POST', token) {
  return new Request('https://youngbar.com/cron/clean-chat', {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  })
}

async function withFetchStub(fetchImpl, callback) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = fetchImpl

  try {
    return await callback()
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('rejects non-POST cron requests before contacting Supabase', async () => {
  await withFetchStub(
    async () => assert.fail('invalid methods must not contact Supabase'),
    async () => {
      const response = await onRequest({
        request: request('GET', SUPABASE_ENV.CRON_SECRET),
        env: SUPABASE_ENV
      })

      assert.equal(response.status, 405)
      assert.equal(response.headers.get('Allow'), 'POST')
    }
  )
})
test('fails closed when the cron secret is not configured', async () => {
  await withFetchStub(
    async () => assert.fail('missing configuration must not contact Supabase'),
    async () => {
      const response = await onRequest({
        request: request('POST', 'cron-secret'),
        env: {
          SUPABASE_URL: SUPABASE_ENV.SUPABASE_URL,
          SUPABASE_SERVICE_KEY: SUPABASE_ENV.SUPABASE_SERVICE_KEY
        }
      })

      assert.equal(response.status, 503)
    }
  )
})

test('rejects a missing cron authorization header', async () => {
  await withFetchStub(
    async () => assert.fail('unauthorized requests must not contact Supabase'),
    async () => {
      const response = await onRequest({
        request: request('POST'),
        env: SUPABASE_ENV
      })

      assert.equal(response.status, 401)
      assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer')
    }
  )
})

test('rejects an incorrect cron secret', async () => {
  await withFetchStub(
    async () => assert.fail('unauthorized requests must not contact Supabase'),
    async () => {
      const response = await onRequest({
        request: request('POST', 'wrong-secret'),
        env: SUPABASE_ENV
      })

      assert.equal(response.status, 401)
    }
  )
})

test('allows an authenticated POST to run the cleanup count query', async () => {
  const calls = []

  await withFetchStub(
    async (url, options) => {
      calls.push({ url, options })
      return new Response(null, {
        status: 200,
        headers: { 'Content-Range': '*/0' }
      })
    },
    async () => {
      const response = await onRequest({
        request: request('POST', SUPABASE_ENV.CRON_SECRET),
        env: SUPABASE_ENV
      })
      const data = await response.json()

      assert.equal(response.status, 200)
      assert.equal(data.success, true)
      assert.equal(data.deletedCount, 0)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].options.method, 'HEAD')
    }
  )
})
