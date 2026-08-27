// 匿名告白墙 - 单条告白 API
// DELETE /api/confession/messages/:id   删除告白（需登录；级联删除其反应）

import { ApiResponse, initDatabase } from '../../../utils/db.js'
import { getUid } from '../_lib.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return ApiResponse.cors(origin)

  const dbInit = initDatabase(env)
  if (!dbInit.success) return dbInit.response
  const db = dbInit.db

  const id = (context.params?.id || '').trim()
  if (!id) return ApiResponse.error('缺少告白 id', origin, 400)

  try {
    if (request.method !== 'DELETE') {
      return ApiResponse.error('不支持的请求方法', origin, 405)
    }

    const uid = await getUid(request, env)
    if (!uid) return ApiResponse.error('请先登录', origin, 401)

    const existing = await db
      .prepare('SELECT id FROM confession_messages WHERE id = ?')
      .bind(id)
      .first()
    if (!existing) return ApiResponse.error('告白不存在', origin, 404)

    // 显式级联删除：D1 默认不强制外键
    await db.batch([
      db.prepare('DELETE FROM confession_reactions WHERE message_id = ?').bind(id),
      db.prepare('DELETE FROM confession_messages WHERE id = ?').bind(id),
    ])

    return ApiResponse.success({ success: true, data: { id } }, origin)
  } catch (err) {
    console.error('[confession/messages/:id] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
