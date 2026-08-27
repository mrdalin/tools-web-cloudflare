// 匿名告白墙 - 反应 toggle API
// POST /api/confession/messages/:id/reactions
//   body: { reaction_type: 'like' | 'hug', user_fingerprint: string }
// 匿名可用；toggle 语义：同一指纹对同一消息的同一反应只保留一次（再点取消）

import { ApiResponse, initDatabase } from '../../../../utils/db.js'
import { nowIso, ALLOWED_REACTION_TYPES } from '../../_lib.js'

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
    if (request.method !== 'POST') {
      return ApiResponse.error('不支持的请求方法', origin, 405)
    }

    const body = await request.json().catch(() => ({}))
    const reactionType = String(body?.reaction_type || '').trim()
    const fingerprint = String(body?.user_fingerprint || '').trim()
    if (!ALLOWED_REACTION_TYPES.has(reactionType)) {
      return ApiResponse.error('reaction_type 必须是 like 或 hug', origin, 400)
    }
    if (!fingerprint) return ApiResponse.error('缺少 user_fingerprint', origin, 400)
    if (fingerprint.length > 128) return ApiResponse.error('user_fingerprint 过长', origin, 400)

    const message = await db
      .prepare('SELECT id FROM confession_messages WHERE id = ?')
      .bind(id)
      .first()
    if (!message) return ApiResponse.error('告白不存在', origin, 404)

    // 列名来自白名单（like -> likes_count / hug -> hugs_count），无注入风险
    const column = reactionType === 'like' ? 'likes_count' : 'hugs_count'
    const existing = await db
      .prepare(
        'SELECT id FROM confession_reactions WHERE message_id = ? AND reaction_type = ? AND user_fingerprint = ?'
      )
      .bind(id, reactionType, fingerprint)
      .first()

    let reacted = false
    if (existing) {
      // 已点过 → 取消（删除反应 + 计数减一，下限 0）
      await db.batch([
        db.prepare('DELETE FROM confession_reactions WHERE id = ?').bind(existing.id),
        db
          .prepare(`UPDATE confession_messages SET ${column} = MAX(0, ${column} - 1) WHERE id = ?`)
          .bind(id),
      ])
    } else {
      // 未点过 → 添加（插入反应 + 计数加一）
      await db.batch([
        db
          .prepare(
            'INSERT INTO confession_reactions (id, message_id, reaction_type, user_fingerprint, created_at) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(crypto.randomUUID(), id, reactionType, fingerprint, nowIso()),
        db
          .prepare(`UPDATE confession_messages SET ${column} = ${column} + 1 WHERE id = ?`)
          .bind(id),
      ])
      reacted = true
    }

    const updated = await db
      .prepare('SELECT likes_count, hugs_count FROM confession_messages WHERE id = ?')
      .bind(id)
      .first()

    return ApiResponse.success(
      {
        success: true,
        data: {
          reacted,
          likes_count: updated?.likes_count ?? 0,
          hugs_count: updated?.hugs_count ?? 0,
        },
      },
      origin
    )
  } catch (err) {
    console.error('[confession/messages/:id/reactions] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
