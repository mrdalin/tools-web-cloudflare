//通过vue-router插件实现模板路由配置
import { createRouter, createWebHistory } from 'vue-router'
import { constantRoute } from './router'
import { getToolSeoMeta } from '@/components/Layout/ToolSeoContent/toolSeoMeta'
import {
  HOME_PAGE_META, SITE_URL, getCanonicalUrl, getPageTitle,
  getPageStructuredData, isIndexablePage, serializeStructuredData,
} from '@/utils/pageSeo'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const resolvePageMeta = (
  path: string,
  meta: { title?: unknown; keywords?: unknown; description?: unknown },
) => {
  const seoMeta = getToolSeoMeta(path)

  return {
    title: String(seoMeta?.title || meta.title || HOME_PAGE_META.title),
    keywords: String(seoMeta?.keywords || meta.keywords || ''),
    description: String(seoMeta?.description || meta.description || HOME_PAGE_META.description),
  }
}

const updateCanonical = (href: string) => {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = href
}

const trackPageView = (path: string) => {
  if (window.location.hostname !== 'youngbar.com') return
  if (typeof window.gtag !== 'function') return

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: `${SITE_URL}${path}`,
    page_path: path,
  })
}

//创建路由器
const router = createRouter({
  history: createWebHistory(),
  routes: constantRoute,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { left: 0, top: 0 }
  },
})

router.beforeEach((to, _from, next) => {
  const unit = to.query.active
  if (to.path === '/unit' && typeof unit === 'string' &&
      ['length', 'area', 'weight', 'time', 'temperature', 'pressure', 'heat', 'power'].includes(unit)) {
    const { active: _active, ...query } = to.query
    next({ path: `/unit/${unit}`, query, hash: to.hash, replace: true })
    return
  }

  if (to.path.length > 1 && to.path.endsWith('/')) {
    next({
      path: to.path.replace(/\/+$/, ''),
      query: to.query,
      hash: to.hash,
      replace: true,
    })
    return
  }

  next()
})

//路由后置卫士
router.afterEach((to, _from, failure) => {
  if (failure) return
  const { title, keywords, description } = resolvePageMeta(to.path, to.meta)
  const canonicalUrl = getCanonicalUrl(to.path)
  const routePattern = to.matched[to.matched.length - 1]?.path || '/:unknown'
  const indexable = isIndexablePage(to.path, routePattern)
  document.title = getPageTitle(title)
  updateCanonical(canonicalUrl)

  // 批量更新 meta 标签
  const metaUpdates = [
    { selector: 'meta[name="keywords"]', attr: 'content', value: String(keywords || '') },
    { selector: 'meta[name="description"]', attr: 'content', value: String(description || '') },
    { selector: 'meta[property="og:title"]', attr: 'content', value: document.title },
    { selector: 'meta[property="og:url"]', attr: 'content', value: canonicalUrl },
    { selector: 'meta[property="og:description"]', attr: 'content', value: String(description || '') },
    { selector: 'meta[name="twitter:title"]', attr: 'content', value: document.title },
    { selector: 'meta[name="twitter:description"]', attr: 'content', value: description },
    { selector: 'meta[name="robots"]', attr: 'content', value: indexable ? 'index,follow' : 'noindex,follow' },
  ]

  metaUpdates.forEach(({ selector, attr, value }) => {
    let element = document.querySelector(selector)
    if (!element) {
      const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/)!
      element = document.createElement('meta')
      element.setAttribute(match[1], match[2])
      document.head.appendChild(element)
    }
    element.setAttribute(attr, value)
  })

  let structuredData = document.querySelector<HTMLScriptElement>('#page-structured-data')
  if (indexable) {
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.id = 'page-structured-data'
      structuredData.type = 'application/ld+json'
      document.head.appendChild(structuredData)
    }
    structuredData.textContent = serializeStructuredData(getPageStructuredData(to.path, { title, description }))
  } else {
    structuredData?.remove()
  }

  trackPageView(to.fullPath)
})

export default router
