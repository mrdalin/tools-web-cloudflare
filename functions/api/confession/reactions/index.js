// 匿名告白墙 - 我的反应查询 API
// GET /api/confession/reactions?user_fingerprint=<fp>
// 返回当前设备指纹已反应过的消息列表（匿名可读，用于初始高亮状态渲染）

import { ApiResponse, initDatabase } from '../../../utils/db.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return ApiResponse.cors(origin)

  const dbInit = initDatabase(env)
  if (!dbInit.success) return dbInit.response
  const db = dbInit.db

  try {
    if (request.method !== 'GET') {
      return ApiResponse.error('不支持的请求方法', origin, 405)
    }

    const url = new URL(request.url)
    const fingerprint = (url.searchParams.get('user_fingerprint') || '').trim()
    if (!fingerprint) return ApiResponse.error('缺少 user_fingerprint', origin, 400)

    const rows = await db
      .prepare(
        'SELECT message_id, reaction_type FROM confession_reactions WHERE user_fingerprint = ?'
      )
      .bind(fingerprint)
      .all()

    const data = (rows.results || []).map((r) => ({
      message_id: r.message_id,
      reaction_type: r.reaction_type,
    }))
    return ApiResponse.success({ success: true, data }, origin)
  } catch (err) {
    console.error('[confession/reactions] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
