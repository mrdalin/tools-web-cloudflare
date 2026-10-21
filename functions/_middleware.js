import { getCORSHeaders } from './utils/cors.js'

export async function onRequest(context) {
  const { request } = context
  const origin = request.headers.get('Origin')
  const url = new URL(request.url)
  const path = url.pathname

  // 这两个旧页面仍可能命中静态资源缓存，直接返回当前 404 页面。
  if (path === '/ai-text-to-image' || path === '/ai-text-to-video') {
    const notFound = await context.env.ASSETS.fetch(new Request(new URL('/404', url)))
    const headers = new Headers(notFound.headers)
    headers.set('Cache-Control', 'no-store')
    headers.set('X-Robots-Tag', 'noindex')
    headers.delete('Age')
    headers.delete('ETag')
    return new Response(request.method === 'HEAD' ? null : notFound.body, {
      status: 404,
      headers
    })
  }

  // 处理 API 路径的 OPTIONS 预检请求
  if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
    return new Response(null, {
      status: 204,
      headers: getCORSHeaders(origin)
    })
  }

  // 继续处理其他请求
  return context.next()
}
