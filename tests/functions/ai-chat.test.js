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
      data: response.headers.get('Content-Type')?.includes('text/event-stream')
        ? await response.text()
        : await response.json(),
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
    'agnes-3.0-flash',
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
  assert.equal(result.calls[0].url, 'https://api.agnes-ai.cn/v1/chat/completions')
  assert.equal(result.calls[0].body.model, 'agnes-3.0-flash')
})

for (const stream of [false, true]) {
  test(`falls back immediately after Agnes rate limits when stream is ${stream}`, async () => {
    const eventStream = 'data: {"choices":[{"delta":{"content":"fallback result"}}]}\n\ndata: [DONE]\n\n'
    const fallback = stream
      ? new Response(eventStream, { headers: { 'Content-Type': 'text/event-stream' } })
      : providerResponse('fallback result')
    const result = await requestWithProviderResponses([
      new Response('error code: 1015', { status: 429, headers: { 'Retry-After': '60' } }),
      fallback
    ], stream ? '198.51.100.6' : '198.51.100.5', { stream })

    assert.equal(result.response.status, 200)
    assert.deepEqual(result.calls.map(call => call.body.model), ['agnes-3.0-flash', 'openai-fast'])
    assert.ok(result.calls.every(call => call.body.stream === stream))
    if (stream) {
      assert.equal(result.response.headers.get('X-AI-Provider'), 'pollinations')
      assert.equal(result.data, eventStream)
    } else {
      assert.equal(result.data.provider, 'pollinations')
      assert.equal(result.data.choices[0].message.content, 'fallback result')
    }
  })

  test(`stops after both text providers rate limit when stream is ${stream}`, async () => {
    const result = await requestWithProviderResponses([
      new Response('Agnes rate limit', { status: 429 }),
      new Response('Pollinations rate limit', { status: 429 })
    ], stream ? '198.51.100.8' : '198.51.100.7', { stream })

    assert.equal(result.response.status, 502)
    assert.equal(result.data.error, 'AI service unavailable')
    assert.match(result.data.detail, /pollinations failed with 429/)
    assert.deepEqual(result.calls.map(call => call.body.model), ['agnes-3.0-flash', 'openai-fast'])
  })
}

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
