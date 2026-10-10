import assert from 'node:assert/strict'
import test from 'node:test'
import { pollVideoStatus, submitVideoTask } from '../../src/components/Tools/AiTextToVideo/api.ts'

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
