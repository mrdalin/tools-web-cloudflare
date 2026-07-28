import assert from 'node:assert/strict'
import test from 'node:test'

import { downloadCanvasAsPng } from '../../src/components/Tools/OldPhotoCaption/download.js'

test('downloads the rendered canvas as a PNG blob without fetching the data URL', async () => {
  const events = []
  const originalDocument = globalThis.document
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  const link = {
    href: '',
    download: '',
    click() {
      events.push('click')
    },
    remove() {
      events.push('remove')
    }
  }

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, 'a')
      return link
    },
    body: {
      appendChild(node) {
        assert.equal(node, link)
        events.push('append')
      }
    }
  }
  URL.createObjectURL = (blob) => {
    assert.equal(blob.type, 'image/png')
    events.push('create-url')
    return 'blob:old-photo'
  }
  URL.revokeObjectURL = (url) => {
    assert.equal(url, 'blob:old-photo')
    events.push('revoke-url')
  }

  try {
    const canvas = {
      toBlob(callback, type) {
        assert.equal(type, 'image/png')
        callback(new Blob(['png'], { type: 'image/png' }))
      }
    }

    downloadCanvasAsPng(canvas, 'old-photo.png')
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(link.href, 'blob:old-photo')
    assert.equal(link.download, 'old-photo.png')
    assert.deepEqual(events, ['create-url', 'append', 'click', 'remove', 'revoke-url'])
  } finally {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  }
})
