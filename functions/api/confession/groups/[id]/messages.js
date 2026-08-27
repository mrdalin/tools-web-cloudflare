// 匿名告白墙 - 分组消息列表 API
// GET /api/confession/groups/:id/messages
//   query:
//     sort=latest|hot   排序方式（默认 latest）
//     before=<created_at>  游标：只取该时间之前的消息
//     limit=<number>    每页条数（默认 20，上限 100）
// 匿名公开可读

import { ApiResponse, initDatabase } from '../../../../utils/db.js'

const PAGE_LIMIT_CAP = 100

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return ApiResponse.cors(origin)

  const dbInit = initDatabase(env)
  if (!dbInit.success) return dbInit.response
  const db = dbInit.db

  const id = (context.params?.id || '').trim()
  if (!id) return ApiResponse.error('缺少分组 id', origin, 400)

  try {
    if (request.method !== 'GET') {
      return ApiResponse.error('不支持的请求方法', origin, 405)
    }

    const url = new URL(request.url)
    const sort = url.searchParams.get('sort') === 'hot' ? 'hot' : 'latest'
    const before = url.searchParams.get('before')
    const parsed = Number(url.searchParams.get('limit') || 20)
    const limit = Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 20, PAGE_LIMIT_CAP))

    const group = await db
      .prepare('SELECT id FROM confession_groups WHERE id = ?')
      .bind(id)
      .first()
    if (!group) return ApiResponse.error('分组不存在', origin, 404)

    // 总数（该分组全部条数，不含游标过滤）
    const countRow = await db
      .prepare('SELECT COUNT(*) AS total FROM confession_messages WHERE group_id = ?')
      .bind(id)
      .first()
    const total = countRow?.total || 0

    let sql = `SELECT id, group_id, content, mood, color, likes_count, hugs_count, created_at
               FROM confession_messages
               WHERE group_id = ?`
    const binds = [id]
    if (before) {
      sql += ' AND created_at < ?'
      binds.push(before)
    }
    if (sort === 'hot') {
      sql += ' ORDER BY likes_count DESC, hugs_count DESC, created_at DESC'
    } else {
      sql += ' ORDER BY created_at DESC'
    }
    sql += ' LIMIT ?'
    binds.push(limit)

    const rows = await db.prepare(sql).bind(...binds).all()
    const messages = (rows.results || []).map((r) => ({
      id: r.id,
      group_id: r.group_id || null,
      content: r.content,
      mood: r.mood || null,
      color: r.color || null,
      likes_count: r.likes_count ?? 0,
      hugs_count: r.hugs_count ?? 0,
      created_at: r.created_at,
    }))

    return ApiResponse.success({ success: true, data: { messages, total } }, origin)
  } catch (err) {
    console.error('[confession/groups/:id/messages] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
