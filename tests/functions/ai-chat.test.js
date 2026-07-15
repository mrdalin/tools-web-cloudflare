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

async function requestWithProviderResponses(responses, ip) {
  const originalFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    const response = responses.shift()
    assert.ok(response, 'unexpected provider request')
    return response
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
        stream: false
      })
    })

    const response = await onRequest({
      request,
      env: {
        AGNES_API_KEY: 'agnes-key',
        POLLINATIONS_API_KEY: 'pollinations-key'
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
    'agnes-2.0-flash',
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
