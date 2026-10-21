import assert from 'node:assert/strict'
import test from 'node:test'
import { AgnesVideoError, pollVideoStatus, submitVideoTask } from '../../src/components/Tools/AiTextToVideo/api.ts'

for (const [name, result] of [
  ['current', { url: 'https://example.com/new.mp4', metadata: { url: 'https://example.com/old.mp4' } }],
  ['legacy', { metadata: { url: 'https://example.com/old.mp4' } }]
]) {
  test(`video polling reads the ${name} completed response`, async (t) => {
    t.mock.method(globalThis, 'setTimeout', (callback) => { callback(); return 0 })
    t.mock.method(globalThis, 'fetch', async (url) => {
      assert.equal(url, '/api/agnes-video-status?video_id=video%2F1')
      return Response.json({ status: 'completed', ...result })
    })
    const progress = []
    const url = await pollVideoStatus('test-key', 'video/1', status => progress.push(status))
    assert.equal(url, result.url || result.metadata.url)
    assert.deepEqual(progress, ['completed'])
  })
}

test('video task submission uses the Flash contract and reads video_id', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/agnes-video')
    assert.deepEqual(JSON.parse(options.body), {
      model: 'agnes-video-2.5-flash', prompt: 'A forest', mode: 'keyframe',
      seconds: '5', size: '720P', aspect_ratio: '16:9',
      first_frame: 'https://example.com/first.png', last_frame: 'https://example.com/last.png'
    })
    return Response.json({ id: 'task-id', video_id: 'video-id' })
  })
  assert.equal(await submitVideoTask('test-key', 'A forest', 5, '16:9', [
    'https://example.com/first.png', 'https://example.com/last.png'
  ]), 'video-id')
})

test('video task submission exposes documented validation details', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'size must be 720P' }, { status: 400 }))
  await assert.rejects(submitVideoTask('test-key', 'test', 5, '16:9'), /size must be 720P/)
})

test('video polling rejects a completed task without a usable result URL', async (t) => {
  t.mock.method(globalThis, 'setTimeout', (callback) => { callback(); return 0 })
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 'completed' }))
  await assert.rejects(pollVideoStatus('test-key', 'video-id'), /没有返回视频地址/)
  assert.equal(fetchMock.mock.callCount(), 1)
})

for (const [name, body, headers, seconds] of [
  ['Cloudflare text', 'error code: 1015', { 'Retry-After': '240' }, 240],
  ['normalized JSON', JSON.stringify({ error: { retry_after: 90 } }), {}, 90],
  ['HTTP date', 'error code: 1015', { 'Retry-After': 'Wed, 21 Oct 2026 00:02:00 GMT' }, 120],
  ['no wait', '<html>Too many requests</html>', {}, 60],
  ['invalid wait', '', { 'Retry-After': '-1' }, 60],
  ['zero wait', '', { 'Retry-After': '0' }, 1]
]) {
  for (const operation of ['submit', 'poll']) {
    test(`video ${operation} preserves a rate limit and stops for ${name}`, async (t) => {
      t.mock.method(Date, 'now', () => Date.UTC(2026, 9, 21))
      const delays = []
      t.mock.method(globalThis, 'setTimeout', (callback, ms) => { delays.push(ms); callback(); return 0 })
      const request = t.mock.method(globalThis, 'fetch', async () => new Response(body, { status: 429, headers }))
      const result = operation === 'submit'
        ? submitVideoTask('test-key', 'A forest', 5, '16:9')
        : pollVideoStatus('test-key', 'keep-this-task')

      await assert.rejects(result, error => {
        assert.ok(error instanceof AgnesVideoError)
        assert.equal(error.status, 429)
        assert.equal(error.retryAfterSeconds, seconds)
        assert.notEqual(error.permanent, true)
        assert.match(error.message, /视频服务请求过于频繁/)
        assert.doesNotMatch(error.message, /1015|html|文本/)
        return true
      })
      assert.equal(request.mock.callCount(), 1)
      assert.deepEqual(delays, operation === 'submit' ? [] : [5000])
    })
  }
}

test('polling stops on authentication errors without losing the task', async (t) => {
  t.mock.method(globalThis, 'setTimeout', callback => { callback(); return 0 })
  const request = t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unauthorized</html>', { status: 401 }))
  await assert.rejects(pollVideoStatus('test-key', 'keep-task'), error => {
    assert.equal(error.status, 401)
    assert.notEqual(error.permanent, true)
    assert.match(error.message, /认证失败/)
    return true
  })
  assert.equal(request.mock.callCount(), 1)
})

test('polling retries transient errors at most three times and preserves their status', async (t) => {
  t.mock.method(globalThis, 'setTimeout', callback => { callback(); return 0 })
  const request = t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unavailable</html>', { status: 503 }))
  await assert.rejects(pollVideoStatus('test-key', 'keep-task'), error => {
    assert.ok(error instanceof AgnesVideoError)
    assert.equal(error.status, 503)
    assert.notEqual(error.permanent, true)
    assert.match(error.message, /查询视频状态失败/)
    assert.doesNotMatch(error.message, /html/)
    return true
  })
  assert.equal(request.mock.callCount(), 3)
})

test('a failed video task stops polling and is marked permanent', async (t) => {
  t.mock.method(globalThis, 'setTimeout', callback => { callback(); return 0 })
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 'failed', error: { message: 'Task failed' } }))
  await assert.rejects(pollVideoStatus('test-key', 'failed-task'), error => {
    assert.equal(error.permanent, true)
    assert.equal(error.message, 'Task failed')
    return true
  })
  assert.equal(request.mock.callCount(), 1)
})

test('leaving the page cancels the polling wait before making another request', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch') })
  const controller = new AbortController()
  const result = pollVideoStatus('test-key', 'keep-task', undefined, controller.signal)
  controller.abort()
  await assert.rejects(result, { name: 'AbortError' })
  assert.equal(request.mock.callCount(), 0)
})

for (const videoId of [null, '', '  ', 123]) {
  test(`submission rejects an invalid task ID: ${JSON.stringify(videoId)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ video_id: videoId }))
    await assert.rejects(submitVideoTask('test-key', 'test', 5, '16:9'), /没有返回任务ID/)
  })
}
