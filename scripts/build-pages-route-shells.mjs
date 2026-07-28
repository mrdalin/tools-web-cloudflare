import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const projectRoot = path.resolve(import.meta.dirname, '..')
const defaultRouterPath = path.join(projectRoot, 'src/router/router.ts')
const defaultOutputDir = path.join(projectRoot, 'dist')
const redirectOnlyRoutes = new Set(['/404', '/privacy-policy'])

export function getStaticPageRoutes(routerSource) {
  const routes = [...routerSource.matchAll(/^\s*path:\s*['"]([^'"]+)['"]/gm)]
    .map((match) => match[1])
    .filter((route) => /^\/[a-z0-9-]+$/i.test(route) && !redirectOnlyRoutes.has(route))

  return [...new Set(routes)]
}

export async function buildPagesRouteShells({
  routerPath = defaultRouterPath,
  outputDir = defaultOutputDir,
} = {}) {
  const resolvedOutputDir = path.resolve(outputDir)
  const indexPath = path.join(resolvedOutputDir, 'index.html')
  const [routerSource, indexHtml] = await Promise.all([
    readFile(routerPath, 'utf8'),
    readFile(indexPath, 'utf8'),
  ])
  const routes = getStaticPageRoutes(routerSource)

  await Promise.all(routes.map(async (route) => {
    const target = path.resolve(resolvedOutputDir, `${route.slice(1)}.html`)
    if (!target.startsWith(`${resolvedOutputDir}${path.sep}`)) {
      throw new Error(`Route output escaped dist: ${route}`)
    }
    await writeFile(target, indexHtml)
  }))

  return routes
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const routes = await buildPagesRouteShells()
  console.log(`[pages-routes] generated ${routes.length} route shells`)
}
