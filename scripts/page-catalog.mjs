import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

export const projectRoot = path.resolve(import.meta.dirname, '..')
export const defaultRouterPath = path.join(projectRoot, 'src/router/router.ts')

// Reuse the browser's pure SEO policy without executing route components in Node.
const policySource = readFileSync(path.join(projectRoot, 'src/utils/pageSeo.ts'), 'utf8')
const policyJs = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
export const pageSeo = await import(`data:text/javascript;base64,${Buffer.from(policyJs).toString('base64')}`)

function parseSource(source) {
  return ts.createSourceFile('catalog.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function declaration(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      const found = statement.declarationList.declarations.find((item) => item.name.getText(sourceFile) === name)
      if (found) return found.initializer
    }
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return statement.body?.statements.find(ts.isReturnStatement)?.expression
    }
  }
  throw new Error(`Missing static catalog export: ${name}`)
}

// Only read literal data. Imports, calls, and template expressions are never evaluated.
function literal(node, bindings = {}) {
  if (!node) return undefined
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isIdentifier(node)) return bindings[node.text]
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
    return literal(node.expression, bindings)
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => literal(item, bindings))
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((item) => [
      item.name.text,
      literal(item.initializer, bindings),
    ]))
  }
  return undefined
}

export function readStaticExport(source, name, bindings) {
  return literal(declaration(parseSource(source), name), bindings)
}

export function getRouteRecords(source) {
  const sourceFile = parseSource(source)
  const routes = declaration(sourceFile, 'constantRoute')
  if (!ts.isArrayLiteralExpression(routes)) throw new Error('constantRoute must be a static array')
  return routes.elements.map((node) => {
    const route = literal(node, pageSeo)
    if (!route?.path) throw new Error('Route is missing a literal path')
    const findComponent = (child) => {
      if (ts.isCallExpression(child) && child.expression.kind === ts.SyntaxKind.ImportKeyword) {
        route.componentPath = literal(child.arguments[0])
      } else {
        ts.forEachChild(child, findComponent)
      }
    }
    const component = node.properties.find((item) => item.name?.getText(sourceFile) === 'component')
    if (component) findComponent(component)
    return route
  })
}

export const isStaticPagePath = (routePath) => /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/i.test(routePath)

export function getStaticPageRoutes(routerSource) {
  return [...new Set(getRouteRecords(routerSource)
    .filter((route) => route.path !== '/' && route.path !== '/404' && !route.redirect)
    .filter((route) => isStaticPagePath(route.path) && pageSeo.getCanonicalPath(route.path) === route.path)
    .map((route) => route.path))]
}

export async function loadPageCatalog({ routerPath = defaultRouterPath } = {}) {
  const [routerSource, toolsSource, metaSource, contentSource] = await Promise.all([
    readFile(routerPath, 'utf8'),
    readFile(path.join(projectRoot, 'src/components/Tools/tools.ts'), 'utf8'),
    readFile(path.join(projectRoot, 'src/components/Layout/ToolSeoContent/toolSeoMeta.ts'), 'utf8'),
    readFile(path.join(projectRoot, 'src/components/Layout/ToolSeoContent/toolSeoContent.ts'), 'utf8'),
  ])
  const routes = getRouteRecords(routerSource)
  const staticPaths = new Set(['/', ...getStaticPageRoutes(routerSource)])
  const metaMap = readStaticExport(metaSource, 'toolSeoMetaMap')
  const contents = readStaticExport(contentSource, 'toolSeoContents')
  const categories = readStaticExport(toolsSource, 'getToolsCate').map((category) => ({
    ...category,
    list: category.list.filter((tool) => staticPaths.has(pageSeo.normalizePagePath(tool.url))),
  })).filter((category) => category.list.length)
  const tools = categories.flatMap((category) => category.list.map((tool) => ({
    ...tool,
    path: pageSeo.normalizePagePath(tool.url),
    category: category.title,
  })))
  const pages = routes.filter((route) => staticPaths.has(route.path)).map((route) => {
    const tool = tools.find((item) => item.path === route.path)
    const meta = { ...route.meta, ...metaMap[route.path] }
    if (!meta.title || !meta.description) throw new Error(`Missing page metadata: ${route.path}`)
    const related = contents[route.path]?.relatedTools || tools
      .filter((item) => item.category === tool?.category && item.path !== route.path)
      .slice(0, 6).map((item) => ({ path: item.path, label: item.title }))
    return {
      ...route, meta, tool, content: contents[route.path],
      related: related.filter((item) => staticPaths.has(item.path)),
      indexable: pageSeo.isIndexablePage(route.path),
    }
  })
  return { pages, categories }
}

export function createSitemap(pages) {
  const urls = pages.filter((page) => page.indexable).map((page) =>
    `  <url><loc>${pageSeo.getCanonicalUrl(page.path)}</loc></url>`)
  // No synthetic lastmod: a build date is not the page's modification date.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}
