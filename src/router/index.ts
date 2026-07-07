//通过vue-router插件实现模板路由配置
import { createRouter, createWebHistory } from 'vue-router'
import { constantRoute } from './router'

const appTitle = import.meta.env.VITE_APP_TITLE || 'Youngbar工具箱'
const appDesc = import.meta.env.VITE_APP_DESC || '一个轻量的在线工具箱'
const siteUrl = 'https://youngbar.com'
const canonicalPathMap = new Map([
  ['/ai/text-to-image', '/ai-text-to-image'],
  ['/privacy-policy', '/privacy'],
  ['/userinfo/todos', '/todos'],
])

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const getCanonicalPath = (path: string) => {
  if (!path || path === '/') return '/'
  const normalizedPath = path.replace(/\/+$/, '')
  return canonicalPathMap.get(normalizedPath) || normalizedPath
}

const getCanonicalUrl = (path: string) => `${siteUrl}${getCanonicalPath(path)}`

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
    page_location: `${siteUrl}${path}`,
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
  if (to.path.length > 1 && to.path.endsWith('/')) {
    next({
      path: to.path.replace(/\/+$/, ''),
      query: to.query,
      hash: to.hash,
      replace: true,
    })
    return
  }

  if (to.meta.title) {
    document.title = `${to.meta.title as string}-${appTitle}`
  }
  next()
})

//路由后置卫士
router.afterEach((to) => {
  const { title, keywords, description } = to.meta
  const canonicalUrl = getCanonicalUrl(to.path)

  if (title) {
    document.title = `${title as string}-${appTitle}`
  } else {
    document.title = `${appTitle}-${appDesc}`
  }

  updateCanonical(canonicalUrl)

  // 批量更新 meta 标签
  const metaUpdates = [
    { selector: 'meta[name="keywords"]', attr: 'content', value: String(keywords || '') },
    { selector: 'meta[name="description"]', attr: 'content', value: String(description || '') },
    { selector: 'meta[property="og:title"]', attr: 'content', value: document.title },
    { selector: 'meta[property="og:url"]', attr: 'content', value: canonicalUrl },
    { selector: 'meta[property="og:description"]', attr: 'content', value: String(description || '') },
  ]

  metaUpdates.forEach(({ selector, attr, value }) => {
    document.querySelector(selector)?.setAttribute(attr, value)
  })

  trackPageView(to.fullPath)
})

export default router
