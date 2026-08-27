// 匿名告白墙 - 分组 API
// GET  /api/confession/groups   列出所有分组（匿名可读，按 sort_order 升序）
// POST /api/confession/groups   body: { name, icon?, color?, description? }（需登录）

import { ApiResponse, initDatabase } from '../../../utils/db.js'
import {
  getUid,
  nowIso,
  slugifyName,
  ensureUniqueSlug,
  validateGroupInput,
} from '../_lib.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return ApiResponse.cors(origin)

  const dbInit = initDatabase(env)
  if (!dbInit.success) return dbInit.response
  const db = dbInit.db

  try {
    // ============ GET: 列出分组 ============
    if (request.method === 'GET') {
      const rows = await db
        .prepare(
          `SELECT id, name, slug, icon, color, description, sort_order, is_default, created_at
           FROM confession_groups
           ORDER BY sort_order ASC, created_at ASC`
        )
        .all()
      const data = (rows.results || []).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        icon: r.icon || null,
        color: r.color || null,
        description: r.description || null,
        sort_order: r.sort_order ?? 0,
        is_default: !!r.is_default,
        created_at: r.created_at,
      }))
      return ApiResponse.success({ success: true, data }, origin)
    }

    // ============ POST: 创建分组 ============
    if (request.method === 'POST') {
      const uid = await getUid(request, env)
      if (!uid) return ApiResponse.error('请先登录', origin, 401)

      const body = await request.json().catch(() => ({}))
      const { errors, name, icon, color, description } = validateGroupInput(body)
      if (errors.length) return ApiResponse.error(errors.join('；'), origin, 400)

      // 排序号 = 当前最大值 + 1
      const maxRow = await db
        .prepare('SELECT MAX(sort_order) AS m FROM confession_groups')
        .first()
      const sortOrder = (Number(maxRow?.m) || 0) + 1

      const id = crypto.randomUUID()
      const slug = await ensureUniqueSlug(db, slugifyName(name))
      const now = nowIso()
      await db
        .prepare(
          `INSERT INTO confession_groups
             (id, name, slug, icon, color, description, sort_order, is_default, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
        )
        .bind(id, name, slug, icon, color, description, sortOrder, now)
        .run()

      return ApiResponse.success(
        {
          success: true,
          data: {
            id,
            name,
            slug,
            icon,
            color,
            description,
            sort_order: sortOrder,
            is_default: false,
            created_at: now,
          },
        },
        origin,
        201
      )
    }

    return ApiResponse.error('不支持的请求方法', origin, 405)
  } catch (err) {
    console.error('[confession/groups] 错误:', err)
    return ApiResponse.error('内部服务器错误', origin, 500)
  }
}

export async function onRequestOptions(context) {
  return ApiResponse.cors(context.request.headers.get('Origin'))
}
