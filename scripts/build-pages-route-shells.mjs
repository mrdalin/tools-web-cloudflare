import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'vue/compiler-sfc'
import { createSitemap, loadPageCatalog, pageSeo, projectRoot, readStaticExport } from './page-catalog.mjs'

export { getStaticPageRoutes } from './page-catalog.mjs'

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

const previewStyle = `<style id="page-preview-style">
.page-preview{box-sizing:border-box;max-width:1080px;margin:0 auto;padding:32px 20px;font:16px/1.85 system-ui,-apple-system,"Segoe UI",sans-serif;color:#24413b}
.page-preview *{box-sizing:border-box}.page-preview a{color:#0f766e;text-underline-offset:3px}.page-preview h1{font-size:30px;line-height:1.4}.page-preview h2{font-size:22px;line-height:1.5}.page-preview h3{font-size:18px}
.page-preview section{margin:20px 0;padding:20px;background:#fff;border:1px solid #dce9e3;border-radius:12px}.page-preview nav{display:flex;gap:16px;flex-wrap:wrap}.page-preview .tool-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;padding:0;list-style:none}.page-preview .tool-list li{padding:12px;border:1px solid #dce9e3;border-radius:8px}.page-preview .tool-list p{margin:6px 0 0;font-size:14px}.page-preview pre{white-space:pre-wrap;overflow-wrap:anywhere}.page-preview table{display:block;max-width:100%;overflow:auto}.page-preview p{overflow-wrap:anywhere}
@media(max-width:600px){.page-preview{padding:20px 14px}.page-preview h1{font-size:25px}.page-preview section{padding:16px}}
</style>`

const safeTags = new Set(['div', 'section', 'article', 'p', 'span', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'code', 'pre', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'a'])

function renderStaticNode(node, bindings = {}) {
  if (node.type === 2) return escapeHtml(node.content)
  if (node.type === 5) return escapeHtml(bindings[node.content.content.trim()] || '')
  if (node.type !== 1) return ''
  const loop = node.props.find((prop) => prop.type === 7 && prop.name === 'for')
  if (loop) {
    const match = loop.exp?.content.match(/^(\w+)\s+in\s+(\w+)$/)
    const values = match && bindings[match[2]]
    if (!Array.isArray(values) || !values.every((value) => typeof value === 'string')) return ''
    return values.map((value) => renderStaticNode({ ...node, props: node.props.filter((prop) => prop !== loop) },
      { ...bindings, [match[1]]: value })).join('')
  }
  // Never export user state, conditionally hidden messages, or interactive controls.
  if (node.props.some((prop) => prop.type === 7 && ['if', 'else', 'else-if', 'for', 'show', 'model', 'html', 'text'].includes(prop.name))) return ''
  const tag = ({ 'el-text': 'span', 'el-link': 'a', 'h1': 'h2', 'main': 'div' })[node.tag] || node.tag
  if (!safeTags.has(tag)) return ''
  if (tag === 'br') return '<br>'
  const body = node.children.map((child) => renderStaticNode(child, bindings)).join('')
  if (!body.trim()) return ''
  const href = node.props.find((prop) => prop.type === 6 && prop.name === 'href')?.value?.content
  if (tag === 'a') {
    return href && /^(?:\/(?!\/)|https?:\/\/|#)/.test(href)
      ? `<a href="${escapeHtml(href)}"${href.startsWith('http') ? ' rel="noopener noreferrer"' : ''}>${body}</a>`
      : body
  }
  return `<${tag}>${body}</${tag}>`
}

async function getComponentDescription(page) {
  if (!page.componentPath?.startsWith('@/components/')) return ''
  const source = await readFile(path.join(projectRoot, 'src', page.componentPath.slice(2)), 'utf8')
  const { descriptor, errors } = parse(source)
  if (errors.length) throw new Error(`Cannot parse page description: ${page.componentPath}`)
  const ast = descriptor.template?.ast
  if (!ast) return ''
  // Public informational pages also need their policy/about text without JavaScript.
  if (['/about', '/privacy'].includes(page.path)) {
    const bindings = page.path === '/privacy' ? Object.fromEntries(
      ['dataItems', 'useItems', 'providerItems'].map((name) => [name, readStaticExport(descriptor.scriptSetup.content, name)]),
    ) : {}
    return ast.children.map((child) => renderStaticNode(child, bindings)).join('')
  }
  const sections = []
  const visit = (node) => {
    if (node.type === 1 && node.tag === 'ToolDetail') {
      sections.push(node.children.map((child) => renderStaticNode(child)).join(''))
      return
    }
    node.children?.forEach(visit)
  }
  visit(ast)
  const body = sections.filter((item) => item.trim()).join('\n')
  return body ? `<section><h2>工具说明</h2>${body}</section>` : ''
}

const renderItems = (tag, items) => `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`
const renderLinks = (links) => `<nav aria-label="相关工具">${links.map((link) =>
  `<a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a>`).join('')}</nav>`

function renderGuide(content) {
  if (!content) return ''
  return `<section aria-label="工具使用说明"><h2>${escapeHtml(content.heading)}</h2><p>${escapeHtml(content.intro)}</p>
<h3>适用场景</h3>${renderItems('ul', content.scenarios)}<h3>使用步骤</h3>${renderItems('ol', content.steps)}
<h3>常见问题</h3>${content.faqs.map((faq) => `<h4>${escapeHtml(faq.question)}</h4><p>${escapeHtml(faq.answer)}</p>`).join('')}</section>`
}

async function renderPageBody(page, categories) {
  const header = `<nav aria-label="网站导航"><a href="/">Youngbar工具箱</a><a href="/about">关于本站</a><a href="/privacy">隐私政策</a></nav>
<h1>${escapeHtml(page.meta.title)}</h1><p>${escapeHtml(page.meta.description)}</p>`
  if (page.path === '/') {
    return `<main class="page-preview">${header}${categories.map((category) => `<section>
<h2>${escapeHtml(category.title)}</h2><ul class="tool-list">${category.list.map((tool) => `<li>
<a href="${escapeHtml(tool.url.replace(/\/+$/, '') || '/')}">${escapeHtml(tool.title)}</a><p>${escapeHtml(tool.desc)}</p></li>`).join('')}</ul></section>`).join('')}</main>`
  }
  const description = await getComponentDescription(page)
  const related = page.related.length ? `<section><h2>相关工具</h2>${renderLinks(page.related)}</section>` : ''
  return `<main class="page-preview">${header}${description}${renderGuide(page.content)}${related}
<noscript><p>启用 JavaScript 后即可使用本页的交互功能。</p></noscript></main>`
}

export function renderPageHtml(template, page, body) {
  const title = pageSeo.getPageTitle(page.meta.title)
  const canonical = page.canonical === false ? null : pageSeo.getCanonicalUrl(page.path)
  const meta = (name, content, attribute = 'name') => `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    meta('keywords', page.meta.keywords || ''),
    meta('description', page.meta.description),
    meta('robots', page.indexable ? 'index,follow' : 'noindex,follow'),
    meta('og:title', title, 'property'),
    meta('og:description', page.meta.description, 'property'),
    meta('twitter:title', title),
    meta('twitter:description', page.meta.description),
  ]
  if (canonical) {
    head.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`, meta('og:url', canonical, 'property'))
    if (page.indexable) {
      const data = pageSeo.getPageStructuredData(page.path, page.meta)
      head.push(`<script id="page-structured-data" type="application/ld+json">${pageSeo.serializeStructuredData(data)}</script>`)
    }
  }
  // Replace the source page's metadata rather than retaining duplicate home tags.
  const clean = template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name=["'](?:keywords|description|robots|twitter:title|twitter:description)["']|property=["'](?:og:title|og:description|og:url)["'])[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*id="page-preview-style"[^>]*>[\s\S]*?<\/style>/gi, '')
  if (!clean.includes('<!--page-content:start-->') || !clean.includes('<!--page-content:end-->')) {
    throw new Error('Page template is missing page-content markers')
  }
  return clean.replace('</head>', () => `${head.join('\n')}\n${previewStyle}\n</head>`)
    .replace(/<!--page-content:start-->[\s\S]*?<!--page-content:end-->/, () => `<!--page-content:start-->${body}<!--page-content:end-->`)
}

export async function buildPagesRouteShells({ routerPath, outputDir = path.join(projectRoot, 'dist') } = {}) {
  const resolvedOutputDir = path.resolve(outputDir)
  const [catalog, template] = await Promise.all([
    loadPageCatalog({ routerPath }),
    readFile(path.join(resolvedOutputDir, 'index.html'), 'utf8'),
  ])
  await Promise.all(catalog.pages.map(async (page) => {
    const target = path.resolve(resolvedOutputDir, page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`)
    if (!target.startsWith(`${resolvedOutputDir}${path.sep}`)) throw new Error(`Route output escaped dist: ${page.path}`)
    const body = await renderPageBody(page, catalog.categories)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, renderPageHtml(template, page, body))
  }))
  const dynamicPage = {
    path: '/', canonical: false, indexable: false,
    meta: { title: '分享内容与详情', description: '查看分享内容或工具详情。页面内容将在加载后显示。' },
  }
  await writeFile(path.join(resolvedOutputDir, 'dynamic-page.html'), renderPageHtml(template, dynamicPage,
    '<main class="page-preview"><h1>分享内容与详情</h1><p>正在打开页面，请稍候。</p><a href="/">返回工具首页</a><noscript><p>查看内容需要启用 JavaScript。</p></noscript></main>'))
  await writeFile(path.join(resolvedOutputDir, 'sitemap.xml'), createSitemap(catalog.pages))
  return catalog.pages.filter((page) => page.path !== '/').map((page) => page.path)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const routes = await buildPagesRouteShells()
  console.log(`[pages-routes] generated ${routes.length} individual pages, home, dynamic entry, and sitemap`)
}
