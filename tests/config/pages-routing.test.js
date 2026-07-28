import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { getStaticPageRoutes } from '../../scripts/build-pages-route-shells.mjs'

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
  assert.match(redirects, /^\/letter\/:slug\s+\/\s+200$/m)
  assert.match(redirects, /^\/qa-view\/:id\s+\/\s+200$/m)
  assert.match(redirects, /^\/backend-docs\/:techId\s+\/\s+200$/m)

  const staticPageRoutes = new Set(getStaticPageRoutes(router))
  const routePaths = [...router.matchAll(/^\s*path:\s*['"]([^'"]+)['"]/gm)]
    .map((match) => match[1])
    .filter((path) => path !== '/' && !path.includes('(.*)'))
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

test('does not give fallback responses broad immutable asset headers', () => {
  assert.doesNotMatch(headers, /immutable/)
  assert.doesNotMatch(headers, /Content-Type:\s*application\/javascript/i)
})
