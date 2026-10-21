import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildPagesRouteShells, getStaticPageRoutes, renderPageHtml } from '../../scripts/build-pages-route-shells.mjs'
import { createSitemap, loadPageCatalog } from '../../scripts/page-catalog.mjs'

const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
const headers = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8')
const notFound = readFileSync(new URL('../../public/404.html', import.meta.url), 'utf8')
const router = readFileSync(new URL('../../src/router/router.ts', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const redirectSources = new Set(
  redirects
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => line.trim().split(/\s+/)[0]),
)

test('keeps missing static assets out of the SPA fallback', () => {
  assert.equal(existsSync(new URL('../../public/404.html', import.meta.url)), true)
  assert.match(notFound, /^<!doctype html>/i)
  assert.doesNotMatch(notFound, /<script\b/i)
  assert.doesNotMatch(redirects, /^\/\*\s+\/index\.html\s+200$/m)
  assert.doesNotMatch(redirects, /^\/:tool\s+\/(?:index\.html)?\s+200$/m)
  assert.match(redirects, /^\/letter\/:slug\s+\/dynamic-page\s+200$/m)
  assert.match(redirects, /^\/qa-view\/:id\s+\/dynamic-page\s+200$/m)
  assert.match(redirects, /^\/backend-docs\/:techId\s+\/dynamic-page\s+200$/m)
  assert.doesNotMatch(redirects, /^\/404\s+\/\s+200$/m)

  const staticPageRoutes = new Set(getStaticPageRoutes(router))
  const routePaths = [...router.matchAll(/^\s*path:\s*['"]([^'"]+)['"]/gm)]
    .map((match) => match[1])
    .filter((path) => !['/', '/404'].includes(path) && !path.includes('(.*)'))
  for (const path of routePaths) {
    assert.equal(
      staticPageRoutes.has(path) || redirectSources.has(path),
      true,
      `missing Pages route shell or redirect for ${path}`,
    )
  }

  assert.equal(staticPageRoutes.has('/old-photo-caption'), true)
  assert.equal(staticPageRoutes.has('/404'), false)
  assert.equal(staticPageRoutes.has('/letter/:slug'), false)
  assert.equal(packageJson.scripts['postbuild:pro'], 'node scripts/build-pages-route-shells.mjs')

  const dynamicRules = redirects
    .split(/\r?\n/)
    .filter((line) => /^\/\S*[:*]/.test(line.trim()))
  assert.ok(dynamicRules.length <= 100)
})

test('caches versioned build assets without caching the HTML shell', () => {
  assert.doesNotMatch(headers, /Content-Type:\s*application\/javascript/i)
  assert.match(
    headers,
    /\/index\.html\r?\n[ \t]+Cache-Control: public, max-age=0, must-revalidate/,
  )
  for (const path of ['/js/*', '/css/*', '/assets/*']) {
    assert.equal(
      existsSync(new URL(`../../public/${path.slice(1, -2)}`, import.meta.url)),
      false,
      `${path} must remain reserved for versioned build output`,
    )
    assert.match(
      headers,
      new RegExp(`${path.replace('*', '\\*')}\\r?\\n[ \\t]+Cache-Control: public, max-age=31536000, immutable`),
      `missing immutable cache policy for ${path}`,
    )
  }
})

test('writes nested static pages while leaving dynamic routes to redirects', async (t) => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'tools-web-pages-'))
  t.after(() => rm(outputDir, { recursive: true, force: true }))
  const indexHtml = '<!doctype html><html><head></head><body><div id="app"><!--page-content:start--><!--page-content:end--></div></body></html>'
  const routerPath = path.join(outputDir, 'routes.ts')
  await writeFile(path.join(outputDir, 'index.html'), indexHtml)
  await writeFile(routerPath, `export const constantRoute = ${JSON.stringify([
    { path: '/travel-map', meta: { title: '旅行地图', description: '标记去过的城市与足迹。' } },
    { path: '/travel-map/plaza', meta: { title: '旅行广场', description: '浏览大家分享的旅行地图。' } },
    { path: '/travel-map/share/:slug' },
    { path: '/flashcards/deck/:id/study' },
    { path: '/../../outside' },
  ])}`)

  await buildPagesRouteShells({ routerPath, outputDir })

  const mapHtml = await readFile(path.join(outputDir, 'travel-map.html'), 'utf8')
  const plazaHtml = await readFile(path.join(outputDir, 'travel-map/plaza.html'), 'utf8')
  assert.match(mapHtml, /<title>旅行地图 - Youngbar工具箱<\/title>/)
  assert.match(plazaHtml, /<title>旅行广场 - Youngbar工具箱<\/title>/)
  assert.match(plazaHtml, /rel="canonical" href="https:\/\/youngbar.com\/travel-map\/plaza"/)
  assert.equal(existsSync(path.join(outputDir, 'travel-map/share')), false)
  assert.equal(existsSync(path.join(outputDir, 'flashcards')), false)
})

test('publishes tool-specific metadata, readable content, and a consistent sitemap', async (t) => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'tools-web-seo-'))
  t.after(() => rm(outputDir, { recursive: true, force: true }))
  await writeFile(path.join(outputDir, 'index.html'), readFileSync(new URL('../../index.html', import.meta.url)))
  const routes = await buildPagesRouteShells({ outputDir })
  const names = ['index', 'json', 'md5', 'base64', 'login', 'userinfo', 'dynamic-page', 'privacy']
  const html = Object.fromEntries(await Promise.all(names.map(async (name) => [
    name, await readFile(path.join(outputDir, `${name}.html`), 'utf8'),
  ])))
  for (const name of ['json', 'md5', 'base64']) {
    assert.equal((html[name].match(/<title>/g) || []).length, 1)
    assert.equal((html[name].match(/name="description"/g) || []).length, 1)
    assert.equal((html[name].match(/rel="canonical"/g) || []).length, 1)
    assert.match(html[name], new RegExp(`rel="canonical" href="https://youngbar.com/${name}"`))
    assert.match(html[name], /<main class="page-preview">/)
    assert.match(html[name], /<h1>[^<]+<\/h1>/)
    assert.match(html[name], /工具说明/)
    assert.match(html[name], /相关工具/)
    const structured = JSON.parse(html[name].match(/type="application\/ld\+json">([^<]+)<\/script>/)[1])
    assert.equal(structured['@graph'][0].url, `https://youngbar.com/${name}`)
    assert.equal(structured['@graph'][0]['@type'], 'WebPage')
  }
  assert.match(html.json, /JSON（JavaScript Object Notation）/)
  assert.match(html.md5, /MD5 是单向摘要算法/)
  assert.notEqual(html.json.match(/<title>(.*?)<\/title>/)[1], html.md5.match(/<title>(.*?)<\/title>/)[1])
  assert.notEqual(html.json.match(/name="description" content="([^"]+)"/)[1], html.md5.match(/name="description" content="([^"]+)"/)[1])
  for (const name of ['login', 'userinfo', 'dynamic-page']) {
    assert.match(html[name], /name="robots" content="noindex,follow"/)
    assert.doesNotMatch(html[name], /application\/ld\+json/)
  }
  assert.doesNotMatch(html['dynamic-page'], /rel="canonical"|property="og:url"/)
  assert.match(html.privacy, /2026 年 10 月 21 日/)
  assert.match(html.privacy, /Resend：发送邮箱验证码/)
  assert.doesNotMatch(html.index, /AI工具|AI绘画|AI 翻译|ai-text-to|agnes/i)
  assert.ok(routes.includes('/flashcards'))
  assert.ok(routes.includes('/ai-gomoku'))
  assert.ok(!routes.includes('/ai-chat'))
  assert.ok(!routes.includes('/ai-text-to-image'))
  assert.equal(existsSync(path.join(outputDir, 'ai-chat.html')), false)
  assert.equal(existsSync(path.join(outputDir, 'privacy-policy.html')), false)
  assert.equal(existsSync(path.join(outputDir, 'userinfo/todos.html')), false)
  const unitTitles = new Set()
  const unitDescriptions = new Set()
  for (const unit of ['length', 'area', 'weight', 'time', 'temperature', 'pressure', 'heat', 'power']) {
    const unitHtml = await readFile(path.join(outputDir, `unit/${unit}.html`), 'utf8')
    assert.ok(unitHtml.includes(`rel="canonical" href="https://youngbar.com/unit/${unit}"`))
    assert.match(unitHtml, /单位换算使用说明/)
    assert.match(unitHtml, /适用场景|常见问题/)
    unitTitles.add(unitHtml.match(/<title>(.*?)<\/title>/)[1])
    unitDescriptions.add(unitHtml.match(/name="description" content="([^"]+)"/)[1])
  }
  assert.equal(unitTitles.size, 8)
  assert.equal(unitDescriptions.size, 8)

  const { pages, categories } = await loadPageCatalog()
  for (const category of categories) {
    for (const tool of category.list) {
      assert.ok(html.index.includes(`href="${tool.url.replace(/\/+$/, '')}"`), `missing crawlable link: ${tool.url}`)
    }
  }
  const sitemap = await readFile(path.join(outputDir, 'sitemap.xml'), 'utf8')
  assert.equal(sitemap, createSitemap(pages))
  assert.equal(sitemap, readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8'))
  assert.doesNotMatch(sitemap, /<lastmod>|\/ai-chat|\/ai-text-to|\/login|\/userinfo|\/privacy-policy|\/404/)
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
  assert.equal(locations.length, new Set(locations).size)
  assert.equal(locations.length, pages.filter((page) => page.indexable).length)
  assert.ok(locations.includes('https://youngbar.com/travel-map/plaza'))
})

test('escapes metadata and prevents JSON-LD script termination', () => {
  const template = '<html><head><title>old</title><link rel="canonical" href="https://old.test/"><meta name="description" content="old"><script type="application/ld+json">{}</script></head><body><div id="app"><!--page-content:start--><!--page-content:end--></div></body></html>'
  const title = '标题 "<& $& </script><script>alert(1)</script>'
  const result = renderPageHtml(template, { path: '/json', indexable: true, meta: { title, description: title } }, '<main>正文</main>')
  assert.doesNotMatch(result, /<script>alert\(1\)<\/script>/)
  assert.match(result, /&quot;&lt;&amp;/)
  const structured = JSON.parse(result.match(/type="application\/ld\+json">([^<]+)<\/script>/)[1])
  assert.equal(structured['@graph'][0].name, title)
  assert.equal((result.match(/rel="canonical"/g) || []).length, 1)
})
