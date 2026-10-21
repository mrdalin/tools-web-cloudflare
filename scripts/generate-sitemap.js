import { writeFile } from 'node:fs/promises'
import { createSitemap, loadPageCatalog, projectRoot } from './page-catalog.mjs'
import path from 'path'

const { pages } = await loadPageCatalog()
await writeFile(path.join(projectRoot, 'public/sitemap.xml'), createSitemap(pages))
console.log(`Generated ${pages.filter((page) => page.indexable).length} canonical sitemap URLs.`)
