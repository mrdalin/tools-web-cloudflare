// AI 媒体作品 API（公开画廊浏览；已剥离 admin 批量推送 AIMW_KEY 部分）
//   GET  /api/ai-media-works              公开列表（仅 approved）
//   GET  /api/ai-media-works/categories   公开分类聚合（仅 approved）
//   GET  /api/ai-media-works/counts       公开按 media_type 聚合总数（仅 approved）
//   GET  /api/ai-media-works/:id          公开详情（仅 approved，view_count+1）
//
// Cloudflare Pages Functions 路由：双中括号 [[path]] 匹配零或多段路径，
// 所以本文件同时处理根 /api/ai-media-works 与所有子路径 /api/ai-media-works/*。

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const VALID_TYPES = new Set(['image', 'video'])

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function jsonError(message, status = 400) {
  return json({ success: false, error: message }, status)
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)
  // URL 形如 /api/ai-media-works/123 或 /api/ai-media-works/categories
  const segs = url.pathname.split('/').filter(Boolean) // ['api', 'ai-media-works', '123' or 'categories']
  const path = segs[2] || ''

  const db = env?.DB
  if (!db) return jsonError('数据库未配置', 500)

  // ---------- GET /api/ai-media-works (列表) ----------
  if (request.method === 'GET' && !path) {
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(60, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 24))
    const category = (url.searchParams.get('category') || '').trim()
    const type = (url.searchParams.get('type') || '').trim().toLowerCase()
    const offset = (page - 1) * pageSize

    const where = [`audit_status = 'approved'`]
    const args = []
    if (category) {
      where.push('category = ?')
      args.push(category)
    }
    if (type && VALID_TYPES.has(type)) {
      where.push('media_type = ?')
      args.push(type)
    }
    const whereSql = `WHERE ${where.join(' AND ')}`

    const totalRow = await db
      .prepare(`SELECT COUNT(*) AS c FROM ai_media_works ${whereSql}`)
      .bind(...args)
      .first()
    const total = totalRow?.c || 0

    const list = await db
      .prepare(
        `SELECT id, media_type, media_url, thumbnail_url, prompt, category,
                model_name, source_name, width, height, duration,
                view_count, created_at
         FROM ai_media_works
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...args, pageSize, offset)
      .all()

    const totalPages = Math.ceil(total / pageSize)
    return json({
      success: true,
      data: {
        list: list.results || [],
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    })
  }

  // ---------- GET /api/ai-media-works/categories ----------
  if (request.method === 'GET' && path === 'categories') {
    const result = await db
      .prepare(
        `SELECT category, COUNT(*) AS count
         FROM ai_media_works
         WHERE audit_status = 'approved'
         GROUP BY category
         ORDER BY count DESC, category ASC`,
      )
      .all()
    return json({
      success: true,
      data: (result.results || []).map((r) => ({
        name: r.category,
        count: r.count,
      })),
    })
  }

  // ---------- GET /api/ai-media-works/counts ----------
  // 按 media_type 聚合的总数（仅 approved），用于前端展示视频/图片总数
  if (request.method === 'GET' && path === 'counts') {
    const result = await db
      .prepare(
        `SELECT media_type, COUNT(*) AS count
         FROM ai_media_works
         WHERE audit_status = 'approved'
         GROUP BY media_type`,
      )
      .all()
    const byType = { image: 0, video: 0 }
    let total = 0
    for (const r of result.results || []) {
      const c = Number(r.count) || 0
      if (r.media_type === 'image' || r.media_type === 'video') {
        byType[r.media_type] = c
      }
      total += c
    }
    return json({
      success: true,
      data: { total, video: byType.video, image: byType.image },
    })
  }

  // ---------- GET /api/ai-media-works/:id ----------
  if (request.method === 'GET' && /^\d+$/.test(path)) {
    const id = parseInt(path, 10)
    const row = await db
      .prepare(
        `SELECT id, media_type, media_url, thumbnail_url, prompt, category,
                model_name, source_name, source_url,
                width, height, duration, file_size, tags,
                audit_status, view_count, created_at, updated_at
         FROM ai_media_works
         WHERE id = ? AND audit_status = 'approved'`,
      )
      .bind(id)
      .first()
    if (!row) return jsonError('作品不存在', 404)
    // 浏览次数 +1（fire-and-forget）
    db.prepare(`UPDATE ai_media_works SET view_count = view_count + 1 WHERE id = ?`)
      .bind(id)
      .run()
      .catch((e) => console.warn('[ai-media-works] view_count update fail:', e?.message))
    return json({ success: true, data: row })
  }

  return jsonError('不支持的请求方法或路径', 405)
}
