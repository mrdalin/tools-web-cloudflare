import assert from 'node:assert/strict'
import test from 'node:test'

import { onRequest as chat } from '../../functions/api/agnes-chat.js'
import { onRequest as image } from '../../functions/api/agnes-image-generations.ts'
import { onRequest as video } from '../../functions/api/agnes-video.js'
import { onRequest as videoStatus } from '../../functions/api/agnes-video-status.js'
import { onRequest as proxy } from '../../functions/api/agnes-proxy.js'
import { onRequest as edit } from '../../functions/api/ai-image-edit.js'
import { onRequest as outfit } from '../../functions/api/ai-outfit.js'

function mockUpstream(t, result = { data: [{ url: 'https://example.com/result.png' }] }) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined })
    return result instanceof Response ? result : Response.json(result)
  })
  return calls
}

function postContext(body) {
  const isForm = body instanceof FormData
  return {
    request: new Request('https://youngbar.com/api/test', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer client-key',
        ...(!isForm ? { 'Content-Type': 'application/json' } : {})
      },
      body: isForm ? body : JSON.stringify(body)
    }),
    env: { AGNES_API_KEY: 'server-key' }
  }
}

test('upgrades old chat selections and preserves multimodal messages and streamed output', async (t) => {
  const stream = 'data: {"choices":[{"delta":{"content":"A red square"}}]}\n\ndata: [DONE]\n\n'
  const calls = mockUpstream(t, new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
  const messages = [{ role: 'user', content: [
    { type: 'text', text: 'Describe the image' },
    { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
  ] }]
  const response = await chat(postContext({ model: 'agnes-2.5-flash', messages, stream: true }))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Type'), 'text/event-stream')
  assert.equal(await response.text(), stream)
  assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/chat/completions')
  assert.equal(calls[0].headers.Authorization, 'Bearer server-key')
  assert.deepEqual(calls[0].body, { model: 'agnes-3.0-flash', messages, stream: true })
})

for (const stream of [false, true]) {
  test(`chat returns a readable rate limit without retrying when stream is ${stream}`, async (t) => {
    const calls = mockUpstream(t, new Response('error code: 1015', { status: 429 }))
    const response = await chat(postContext({ messages: [{ role: 'user', content: 'test' }], stream }))

    assert.equal(calls.length, 1)
    assert.equal(response.status, 429)
    assert.equal(response.headers.get('Content-Type'), 'application/json')
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://youngbar.com')
    assert.equal(response.headers.get('Retry-After'), '60')
    assert.deepEqual(await response.json(), {
      error: {
        code: 'rate_limit_exceeded',
        message: '文本服务请求过于频繁，请在 60 秒后重试',
        retry_after: 60
      }
    })
  })
}

for (const [retryAfter, expectedSeconds] of [
  ['120', 120],
  ['0', 1],
  ['Wed, 21 Oct 2026 00:02:00 GMT', 120],
  ['Wed, 21 Oct 2026 00:00:00 GMT', 1],
  ['', 60],
  ['-1', 60],
  ['invalid', 60]
]) {
  test(`chat normalizes Retry-After ${JSON.stringify(retryAfter)} to ${expectedSeconds} seconds`, async (t) => {
    t.mock.method(Date, 'now', () => Date.UTC(2026, 9, 21))
    const calls = mockUpstream(t, Response.json({ error: 'quota exceeded' }, {
      status: 429,
      headers: { 'Retry-After': retryAfter }
    }))
    const response = await chat(postContext({ messages: [{ role: 'user', content: 'test' }] }))

    assert.equal(calls.length, 1)
    assert.equal(response.status, 429)
    assert.equal(response.headers.get('Retry-After'), String(expectedSeconds))
    const { error } = await response.json()
    assert.equal(error.retry_after, expectedSeconds)
    assert.equal(error.message, `文本服务请求过于频繁，请在 ${expectedSeconds} 秒后重试`)
  })
}

test('image proxy upgrades cached models and preserves reference images and output format', async (t) => {
  const calls = mockUpstream(t)
  const payload = {
    model: 'agnes-image-2.1-flash', prompt: 'Combine these images', size: '2K', ratio: '16:9',
    extra_body: { image: ['https://example.com/a.png', 'data:image/png;base64,Yg=='], response_format: 'url' }
  }
  const response = await image(postContext(payload))

  assert.equal(response.status, 200)
  assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/images/generations')
  assert.deepEqual(calls[0].body, { ...payload, model: 'agnes-image-2.5-flash' })
  assert.equal((await response.json()).data[0].url, 'https://example.com/result.png')
})

for (const mode of ['text', 'keyframe', 'reference']) {
  test(`video proxy uses Flash and preserves ${mode} inputs`, async (t) => {
    const calls = mockUpstream(t, { video_id: 'test-video' })
    const media = mode === 'keyframe'
      ? { first_frame: 'https://example.com/first.png', last_frame: 'https://example.com/last.png' }
      : mode === 'reference' ? { images: ['https://example.com/reference.png'] } : {}
    const payload = { model: 'agnes-video-2.5', prompt: 'A quiet forest', mode, seconds: '5', size: '720P', ...media }
    const response = await video(postContext(payload))

    assert.equal(response.status, 200)
    assert.equal((await response.json()).video_id, 'test-video')
    assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/videos')
    assert.deepEqual(calls[0].body, { ...payload, model: 'agnes-video-2.5-flash' })
  })
}

test('video polling escapes the video ID, pins the Flash model and passes the result URL through', async (t) => {
  const result = { status: 'completed', url: 'https://example.com/video.mp4' }
  const calls = mockUpstream(t, result)
  const videoId = 'job/a+b&model_name=other'
  const response = await videoStatus({
    request: new Request(`https://youngbar.com/api/agnes-video-status?video_id=${encodeURIComponent(videoId)}`),
    env: { AGNES_API_KEY: 'server-key' }
  })
  const url = new URL(calls[0].url)
  assert.equal(url.origin + url.pathname, 'https://api.agnes-ai.cn/agnesapi')
  assert.equal(url.searchParams.get('video_id'), videoId)
  assert.deepEqual(url.searchParams.getAll('model_name'), ['agnes-video-2.5-flash'])
  assert.deepEqual(await response.json(), result)
})

test('image editing sends uploaded images to the new model inside extra_body', async (t) => {
  const calls = mockUpstream(t)
  const form = new FormData()
  form.set('prompt', 'Make it blue')
  form.append('images', new File(['input'], 'input.png', { type: 'image/png' }))
  const response = await edit(postContext(form))

  assert.equal(response.status, 200)
  assert.equal((await response.json()).ok, true)
  assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/images/generations')
  assert.equal(calls[0].body.model, 'agnes-image-2.5-flash')
  assert.deepEqual(calls[0].body.extra_body, { response_format: 'url', image: ['data:image/png;base64,aW5wdXQ='] })
  assert.equal(calls[0].body.response_format, undefined)
})

test('outfit generation preserves person and clothing image order with the new model', async (t) => {
  const calls = mockUpstream(t)
  const form = new FormData()
  form.append('personImages', new File(['person'], 'person.png', { type: 'image/png' }))
  form.append('clothingImages', new File(['clothing'], 'clothing.png', { type: 'image/png' }))
  const response = await outfit(postContext(form))

  assert.equal(response.status, 200)
  assert.equal((await response.json()).ok, true)
  assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/images/generations')
  assert.equal(calls[0].body.model, 'agnes-image-2.5-flash')
  assert.deepEqual(calls[0].body.extra_body.image, ['data:image/png;base64,cGVyc29u', 'data:image/png;base64,Y2xvdGhpbmc='])
})

test('legacy proxy also selects the current model for each generation endpoint', async (t) => {
  const calls = mockUpstream(t)
  for (const [endpoint, model] of Object.entries({
    'chat/completions': 'agnes-3.0-flash',
    responses: 'agnes-3.0-flash',
    messages: 'agnes-3.0-flash',
    'images/generations': 'agnes-image-2.5-flash',
    videos: 'agnes-video-2.5-flash'
  })) {
    const response = await proxy(postContext({ endpoint, model: 'old-model', prompt: 'test' }))
    assert.equal(response.status, 200)
    assert.equal(calls.at(-1).url, `https://api.agnes-ai.cn/v1/${endpoint}`)
    assert.deepEqual(calls.at(-1).body, { model, prompt: 'test' })
  }
})

for (const endpoint of ['chat/completions', 'responses', 'messages']) {
  test(`legacy ${endpoint} proxy preserves text rate limits from a non-JSON upstream response`, async (t) => {
    const calls = mockUpstream(t, new Response('error code: 1015', {
      status: 429,
      headers: { 'Retry-After': '90' }
    }))
    const response = await proxy(postContext({ endpoint, messages: [{ role: 'user', content: 'test' }] }))

    assert.equal(calls.length, 1)
    assert.equal(response.status, 429)
    assert.equal(response.headers.get('Retry-After'), '90')
    const { error } = await response.json()
    assert.equal(error.code, 'rate_limit_exceeded')
    assert.equal(error.retry_after, 90)
    assert.equal(error.message, '文本服务请求过于频繁，请在 90 秒后重试')
  })
}

test('upstream validation errors retain their status and detail', async (t) => {
  const result = { detail: 'size must be 720P' }
  mockUpstream(t, Response.json(result, { status: 400 }))
  const response = await video(postContext({ prompt: 'test', size: '1080P' }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), result)
})
