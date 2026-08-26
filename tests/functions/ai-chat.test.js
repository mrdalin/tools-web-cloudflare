import assert from 'node:assert/strict'
import test from 'node:test'

import { onRequest } from '../../functions/api/ai-chat.js'

function providerResponse(content, finishReason = 'stop') {
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: finishReason,
      message: {
        content,
        reasoning_content: 'reasoning'
      }
    }]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function requestWithProviderResponses(responses, ip, bodyOverrides = {}) {
  const originalFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    const response = responses.shift()
    assert.ok(response, 'unexpected provider request')
    return typeof response === 'function' ? response(url, options) : response
  }

  try {
    const request = new Request('https://youngbar.com/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': ip,
        'Origin': 'https://youngbar.com'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 2000,
        stream: false,
        ...bodyOverrides
      })
    })

    const response = await onRequest({
      request,
      env: {
        AGNES_API_KEY: 'agnes-key'
      }
    })

    return {
      response,
      data: await response.json(),
      calls
    }
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('falls back to Pollinations when Agnes returns empty content', async () => {
  const result = await requestWithProviderResponses([
    providerResponse('   '),
    providerResponse('fallback result')
  ], '198.51.100.1')

  assert.equal(result.response.status, 200)
  assert.equal(result.data.provider, 'pollinations')
  assert.equal(result.data.choices[0].message.content, 'fallback result')
  assert.deepEqual(result.calls.map(call => call.body.model), [
    'agnes-2.5-flash',
    'openai-fast'
  ])
})

test('falls back to Pollinations when Agnes stops because of length', async () => {
  const result = await requestWithProviderResponses([
    providerResponse('partial result', 'length'),
    providerResponse('complete fallback result')
  ], '198.51.100.2')

  assert.equal(result.response.status, 200)
  assert.equal(result.data.provider, 'pollinations')
  assert.equal(result.data.choices[0].message.content, 'complete fallback result')
  assert.equal(result.calls.length, 2)
})

test('returns a usable Agnes response without calling Pollinations', async () => {
  const result = await requestWithProviderResponses([
    providerResponse('agnes result')
  ], '198.51.100.3')

  assert.equal(result.response.status, 200)
  assert.equal(result.data.provider, 'agnes')
  assert.equal(result.data.choices[0].message.content, 'agnes result')
  assert.equal(result.calls.length, 1)
})

test('falls back within the request budget when Agnes times out', async () => {
  const waitForAbort = (_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => {
      reject(new DOMException('Request aborted', 'AbortError'))
    }, { once: true })
  })
  const startedAt = Date.now()

  const result = await requestWithProviderResponses([
    waitForAbort,
    providerResponse('timely fallback result')
  ], '198.51.100.4', { timeout_ms: 1 })

  assert.equal(result.response.status, 200)
  assert.equal(result.data.provider, 'pollinations')
  assert.equal(result.data.choices[0].message.content, 'timely fallback result')
  assert.equal(result.calls.length, 2)
  assert.ok(Date.now() - startedAt < 2500)
})
