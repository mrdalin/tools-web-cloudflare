import { readFile, writeFile } from 'node:fs/promises'

const siteUrl = 'https://youngbar.com'
const now = new Date()
const lastmod = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')

const excludedPaths = new Set([
  '/404',
  '/:pathMatch(.*)*',
  '/ai/text-to-image',
  '/login',
  '/privacy-policy',
  '/userinfo',
  '/userinfo/todos',
])

const monthlyLowPriority = new Set([
  '/about',
  '/privacy',
  '/coin',
  '/dice',
  '/snake',
  '/memory',
  '/tetris',
  '/whackamole',
  '/game2048',
  '/minesweeper',
  '/puzzle',
  '/sudoku',
  '/ai-gomoku',
  '/gomoku-online',
  '/guess-number',
  '/number-memory',
])

const weeklyHighPriority = new Set([
  '/ai-text-to-image',
  '/ai-text-to-video',
  '/ai-text-to-speech',
  '/ai-translate',
  '/ai-name',
  '/ai-chat',
  '/ai-daily-motivation',
  '/ai-interview',
  '/markdown',
  '/qrcode',
  '/mock-data',
  '/notes',
  '/todos',
  '/qa',
])

const normalizePath = (path) => {
  if (path === '/') return path
  return path.replace(/\/+$/, '')
}

const getRoutePaths = async () => {
  const source = await readFile('src/router/router.ts', 'utf8')
  const paths = []
  const seen = new Set()
  const matches = source.matchAll(/path:\s*['"]([^'"]+)['"]/g)

  for (const match of matches) {
    const path = normalizePath(match[1])
    if (seen.has(path)) continue
    if (excludedPaths.has(path)) continue
    if (path.includes(':')) continue

    seen.add(path)
    paths.push(path)
  }

  return paths
}

const getEntryMeta = (path) => {
  if (path === '/') {
    return { changefreq: 'daily', priority: '1.0' }
  }

  if (weeklyHighPriority.has(path) || path.startsWith('/ai-')) {
    return { changefreq: 'weekly', priority: '0.7' }
  }

  if (monthlyLowPriority.has(path)) {
    return { changefreq: 'monthly', priority: '0.3' }
  }

  return { changefreq: 'monthly', priority: '0.5' }
}

const toUrlEntry = (path) => {
  const { changefreq, priority } = getEntryMeta(path)
  const loc = path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`

  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

const main = async () => {
  const paths = await getRoutePaths()
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(toUrlEntry),
    '</urlset>',
    '',
  ].join('\n')

  await Promise.all([
    writeFile('public/sitemap.xml', xml),
    writeFile('sitemap.xml', xml),
  ])

  console.log(`Generated ${paths.length} sitemap URLs.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
