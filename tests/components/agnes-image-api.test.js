import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { AgnesImageError, generateAgnesImages } from '../../src/utils/agnesImage.ts'

test('image generation sends the configured model and reads URL and Base64 results', async (t) => {
  const controller = new AbortController()
  t.mock.method(axios, 'post', async (url, body, config) => {
    assert.equal(url, '/api/agnes-image-generations')
    assert.deepEqual(body, {
      model: 'agnes-image-2.5-flash', prompt: 'A blue circle', size: '1024x1024',
      n: 2, extra_body: { response_format: 'url' }
    })
    assert.equal(config.timeout, 120000)
    assert.equal(config.signal, controller.signal)
    return { data: { data: [{ url: 'https://example.com/image.png' }, { b64_json: 'aW1hZ2U=' }] } }
  })

  assert.deepEqual(await generateAgnesImages({ prompt: 'A blue circle', count: 2, signal: controller.signal }), [
    'https://example.com/image.png', 'data:image/png;base64,aW1hZ2U='
  ])
})

for (const [name, data, headers, seconds] of [
  ['Cloudflare text', 'error code: 1015\n', { 'retry-after': '180' }, 180],
  ['normalized JSON', { error: { code: 'rate_limit_exceeded', retry_after: 90 } }, {}, 90],
  ['missing wait', '<html>Too many requests</html>', {}, 60]
]) {
  test(`image rate limits expose a countdown for ${name} responses`, async (t) => {
    const request = t.mock.method(axios, 'post', async () => {
      throw { response: { status: 429, data, headers } }
    })

    await assert.rejects(generateAgnesImages({ prompt: 'A blue circle' }), error => {
      assert.ok(error instanceof AgnesImageError)
      assert.equal(error.status, 429)
      assert.equal(error.retryAfterSeconds, seconds)
      assert.match(error.message, /图像服务请求过于频繁/)
      assert.doesNotMatch(error.message, /1015|html|文本|10/)
      return true
    })
    assert.equal(request.mock.callCount(), 1)
  })
}

for (const [name, failure, message] of [
  ['validation', { response: { status: 400, data: { detail: 'Unsupported image size' } } }, /Unsupported image size/],
  ['authentication', { response: { status: 401, data: {} } }, /图像服务认证失败/],
  ['forbidden', { response: { status: 403, data: '<html>Forbidden</html>' } }, /图像服务认证失败/],
  ['gateway HTML', { response: { status: 502, data: '<html>Bad gateway</html>' } }, /图片生成服务暂时不可用/],
  ['timeout', { code: 'ECONNABORTED' }, /图片生成超时/],
  ['network', { code: 'ERR_NETWORK' }, /网络连接失败/]
]) {
  test(`image failures show the cause for ${name} errors`, async (t) => {
    t.mock.method(axios, 'post', async () => { throw failure })
    await assert.rejects(generateAgnesImages({ prompt: 'A blue circle' }), message)
  })
}

for (const data of [{ data: [] }, { data: {} }, { data: [{ url: '' }, { url: 123 }] }]) {
  test(`image generation rejects an unusable result: ${JSON.stringify(data)}`, async (t) => {
    t.mock.method(axios, 'post', async () => ({ data }))
    await assert.rejects(generateAgnesImages({ prompt: 'A blue circle' }), /图片生成结果为空/)
  })
}
