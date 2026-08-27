// 匿名告白墙 - 发布告白 API
// POST /api/confession/messages
//   body: { content, mood?, color?, group_id? }
// 匿名可发（无需登录）

import { ApiResponse, initDatabase } from '../../../utils/db.js'
import { nowIso, validateMessageInput } from '../_lib.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return ApiResponse.cors(origin)

  const dbInit = initDatabase(env)
  if (!dbInit.success) return dbInit.response
  const db = dbInit.db

  try {
    if (request.method !== 'POST') {
      return ApiResponse.error('不支持的请求方法', origin, 405)
    }

    const body = await request.json().catch(() => ({}))
    const { errors, content, mood, color, group_id } = validateMessageInput(body)
    if (errors.length) return ApiResponse.error(errors.join('；'), origin, 400)

    // group_id 可选；若提供必须存在
    if (group_id) {
      const group = await db
        .prepare('SELECT id FROM confession_groups WHERE id = ?')
        .bind(group_id)
        .first()
      if (!group) return ApiResponse.error('分组不存在', origin, 404)
    }

    const id = crypto.randomUUID()
    const now = nowIso()
    await db
      .prepare(
        `INSERT INTO confession_messages
           (id, group_id, content, mood, color, likes_count, hugs_count, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?)`
      )
      .bind(id, group_id, content, mood, color, now)
      .run()

    return ApiResponse.success(
      {
        success: true,
        data: {
          id,
          group_id,
          content,
          mood,
          color,
          likes_count: 0,
          hugs_count: 0,
          created_at: now,
        },
      },
      origin,
      201
    )
  } catch (err) {
    console.error('[confession/messages] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
