export const SITE_NAME = 'Youngbar工具箱'
export const SITE_URL = 'https://youngbar.com'

export const HOME_PAGE_META = {
  title: '免费在线工具大全',
  keywords: '在线工具,免费工具,JSON格式化,Base64,时间戳转换,二维码,图片压缩,PDF工具,文本处理,单位换算',
  description: 'Youngbar工具箱提供开发运维、文本处理、教育学术、图片处理、数据图表、生活查询与趣味游戏等免费在线工具。每个工具均有独立页面和使用说明，大多数工具无需登录即可使用。',
}

export const CANONICAL_PATHS: Record<string, string> = {
  '/privacy-policy': '/privacy',
  '/userinfo/todos': '/todos',
}

export const NON_INDEXABLE_PATHS = ['/login', '/userinfo', '/404']

export const normalizePagePath = (path: string) => {
  return path.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
}

export const getCanonicalPath = (path: string) => {
  const normalized = normalizePagePath(path)
  return CANONICAL_PATHS[normalized] || normalized
}

export const getCanonicalUrl = (path: string) => `${SITE_URL}${getCanonicalPath(path)}`

export const getPageTitle = (title?: string) => `${title || HOME_PAGE_META.title} - ${SITE_NAME}`

// Account pages and parameterized user content stay out of the tool index.
export const isIndexablePage = (path: string, routePattern = path) => {
  return !NON_INDEXABLE_PATHS.includes(normalizePagePath(path)) && !routePattern.includes(':')
}

export const getPageStructuredData = (path: string, meta: { title?: string; description?: string }) => {
  const canonical = getCanonicalUrl(path)
  const page = {
    '@context': 'https://schema.org',
    '@type': path === '/' ? 'WebSite' : 'WebPage',
    name: path === '/' ? SITE_NAME : meta.title,
    url: canonical,
    description: meta.description,
    inLanguage: 'zh-CN',
  }
  if (path === '/') return page
  return {
    '@context': 'https://schema.org',
    '@graph': [
      page,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: meta.title, item: canonical },
        ],
      },
    ],
  }
}

export const serializeStructuredData = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
