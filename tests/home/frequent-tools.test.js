import assert from 'node:assert/strict'
import test from 'node:test'

let moduleId = 0
async function setup(t, initialState) {
  const data = new Map()
  const browser = new EventTarget()
  browser.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }
  const previousWindow = globalThis.window
  globalThis.window = browser
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  })
  const api = await import('../../src/utils/frequentTools.ts?test=' + moduleId++)
  if (initialState !== undefined) {
    data.set(api.FREQUENT_TOOLS_STORAGE_KEY, typeof initialState === 'string' ? initialState : JSON.stringify(initialState))
  }
  return {
    ...api, browser, data,
    paths: () => api.getFrequentTools().map(item => api.normalizeToolPath(item.tool.url)),
    state: () => JSON.parse(data.get(api.FREQUENT_TOOLS_STORAGE_KEY)),
  }
}

test('starts with eight recommendations without writing or requiring an account', async t => {
  const api = await setup(t)
  assert.equal(api.getFrequentTools().length, 8)
  assert.equal(api.getFrequentTools().every(item => item.isRecommended), true)
  assert.equal(api.data.size, 0)
  assert.deepEqual(api.getFrequentTools(0), [])
  assert.deepEqual(api.getFrequentTools(-2), [])
})

test('selects used tools by frequency, then recency, and fills unused places with recommendations', async t => {
  const api = await setup(t, {
    version: 1,
    records: [
      { path: '/json', useCount: 3, lastUsed: 10 },
      { path: '/uuid', useCount: 1, lastUsed: 30 },
      { path: '/reg', useCount: 1, lastUsed: 20 },
    ],
  })
  assert.deepEqual(api.paths().slice(0, 3), ['/json', '/uuid', '/reg'])
  assert.equal(api.getFrequentTools()[0].isRecommended, false)
  assert.equal(api.getFrequentTools()[3].isRecommended, true)
  assert.equal(api.paths().length, 8)
})

test('counts entry into a tool once while ignoring query, hash, and internal detail changes', async t => {
  const api = await setup(t)
  api.recordToolVisit('/json/?input=private#result', '/')
  api.recordToolVisit('/json?input=changed', '/json#result')
  api.recordToolVisit('/backend-docs/mongodb', '/')
  api.recordToolVisit('/backend-docs/redis', '/backend-docs/mongodb')
  api.recordToolVisit('/unit/length', '/unit')
  api.recordToolVisit('/json', '/')
  for (const path of ['/', '/about', '/login', '/404', '/json/unknown', '/unit/missing', '/backend-docs/a/unknown']) {
    api.recordToolVisit(path, '/')
  }
  assert.deepEqual(api.state().records.map(({ path, useCount }) => ({ path, useCount })), [
    { path: '/json', useCount: 2 },
    { path: '/backend-docs', useCount: 1 },
    { path: '/unit/length', useCount: 1 },
  ])
  assert.equal(JSON.stringify(api.state()).includes('private'), false)
  assert.equal(JSON.stringify(api.state()).includes('mongodb'), false)
})

test('removed tools stay hidden on later visits and restoring retains their usage history', async t => {
  const api = await setup(t)
  api.recordToolVisit('/json', '/')
  api.removeFrequentTool('/json')
  api.recordToolVisit('/json', '/')
  assert.equal(api.paths().includes('/json'), false)
  assert.equal(api.state().records[0].useCount, 2)
  api.restoreFrequentTools()
  assert.equal(api.paths()[0], '/json')
  assert.equal(api.getFrequentTools()[0].useCount, 2)
  assert.deepEqual(api.state().hiddenPaths, [])
})

test('manual order survives visits while new used tools can replace default recommendations', async t => {
  const api = await setup(t)
  api.reorderFrequentTools('/md5', '/json')
  assert.deepEqual(api.paths(), ['/md5', '/json', '/timetran', '/qrcode', '/randompassword', '/unit', '/colorpicker', '/base64'])
  api.recordToolVisit('/uuid', '/')
  assert.deepEqual(api.paths(), ['/md5', '/json', '/timetran', '/qrcode', '/randompassword', '/unit', '/colorpicker', '/uuid'])
  api.recordToolVisit('/json', '/')
  assert.equal(api.paths()[0], '/md5')
  api.restoreFrequentTools()
  assert.equal(api.paths()[0], '/json')
  assert.deepEqual(api.state().order, [])
})

test('all recommendations can be removed and then restored', async t => {
  const api = await setup(t)
  for (const path of api.paths()) api.removeFrequentTool(path)
  assert.deepEqual(api.paths(), [])
  api.reorderFrequentTools('/json', '/md5')
  assert.deepEqual(api.paths(), [])
  api.restoreFrequentTools()
  assert.equal(api.paths().length, 8)
})

test('invalid and duplicate saved records do not contaminate the tool list', async t => {
  const api = await setup(t, {
    version: 1,
    records: [null, {},
      { path: '/json/', useCount: 2, lastUsed: 10 },
      { path: '/json?data=x', useCount: 4, lastUsed: 20 },
      { path: '/not-a-tool', useCount: 100, lastUsed: 100 },
      { path: '/md5', useCount: -1, lastUsed: 100 },
      { path: '/uuid', useCount: '9', lastUsed: 100 },
    ],
    hiddenPaths: [null, 5, '/md5/', '/md5', '/missing'],
    order: [null, '/json/', '/json', '/missing'],
  })
  assert.equal(api.paths()[0], '/json')
  assert.equal(api.getFrequentTools()[0].useCount, 4)
  assert.equal(api.paths().includes('/md5'), false)
  api.recordToolVisit('/json', '/')
  assert.deepEqual(api.state().records.map(({ path, useCount }) => ({ path, useCount })), [{ path: '/json', useCount: 5 }])
  assert.deepEqual(api.state().hiddenPaths, ['/md5'])
  assert.deepEqual(api.state().order, ['/json'])
})

test('corrupt or unsupported storage falls back to recommendations and can be repaired', async t => {
  const api = await setup(t, '{broken json')
  assert.equal(api.paths().length, 8)
  api.data.set(api.FREQUENT_TOOLS_STORAGE_KEY, '{"version":2,"records":[]}')
  assert.equal(api.paths().length, 8)
  api.recordToolVisit('/uuid', '/')
  assert.equal(api.paths()[0], '/uuid')
  assert.equal(api.state().version, 1)
})

test('browser storage restrictions retain usable management in memory and notify the current page', async t => {
  const api = await setup(t)
  api.browser.localStorage = {
    getItem: () => { throw new Error('Storage blocked') },
    setItem: () => { throw new Error('Quota exceeded') },
  }
  let updates = 0
  api.browser.addEventListener(api.FREQUENT_TOOLS_UPDATED_EVENT, () => updates++)
  api.recordToolVisit('/uuid', '/')
  assert.equal(api.isFrequentToolsPersistent(), false)
  assert.equal(api.paths()[0], '/uuid')
  api.removeFrequentTool('/uuid')
  assert.equal(api.paths().includes('/uuid'), false)
  api.restoreFrequentTools()
  assert.equal(api.paths()[0], '/uuid')
  assert.equal(updates, 3)
  assert.equal(api.data.size, 0)
})
