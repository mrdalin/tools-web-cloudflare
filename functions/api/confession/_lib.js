// 匿名告白墙 API 共享库
// 提供：uid 提取、时间戳、slug 生成、入参校验、反应类型白名单
//
// 鉴权说明：目标仓库 user 表当前没有 is_admin 字段，因此「分组创建/删除、
// 删除告白」这类管理操作仅要求登录（复用项目 JWT）。若后续给 user 表加上
// is_admin 字段，可在此引入 isAdmin(db, uid) 做管理员校验。

import { extractUidFromRequest } from '../_lib/model-resolver.js'

// 当前时间（ISO 8601 UTC，TEXT 存储，字典序即时间序）
export function nowIso() {
  return new Date().toISOString()
}

// 读取登录 uid（未登录 / token 无效返回空字符串）
export async function getUid(request, env) {
  try {
    return await extractUidFromRequest(request, env)
  } catch {
    return ''
  }
}

// 从分组名生成 slug：保留 ASCII 字母数字与中文，其余转为连字符
export function slugifyName(name) {
  const slug = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `group-${crypto.randomUUID().slice(0, 8)}`
}

// 确保 slug 唯一（撞名时追加短随机后缀）
export async function ensureUniqueSlug(db, base) {
  let slug = base
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await db
      .prepare('SELECT 1 FROM confession_groups WHERE slug = ?')
      .bind(slug)
      .first()
    if (!row) return slug
    slug = `${base}-${crypto.randomUUID().slice(0, 4)}`
  }
}

// 校验创建分组入参
export function validateGroupInput(body) {
  const name = (body?.name ?? '').toString().trim()
  const icon = (body?.icon ?? '').toString().trim() || '📝'
  const color = (body?.color ?? '').toString().trim() || '#FFE4E1'
  const description = (body?.description ?? '').toString().trim()
  const errors = []
  if (!name) errors.push('分组名不能为空')
  else if (name.length > 20) errors.push('分组名不能超过 20 字')
  if (icon.length > 16) errors.push('图标过长')
  if (color.length > 32) errors.push('主题色过长')
  if (description.length > 50) errors.push('简介不能超过 50 字')
  return { errors, name, icon, color, description }
}

// 校验发布告白入参
export function validateMessageInput(body) {
  const content = (body?.content ?? '').toString().trim()
  const mood = (body?.mood ?? '').toString().trim() || '😊'
  const color = (body?.color ?? '').toString().trim() || '#FFE4E1'
  const groupIdRaw = body?.group_id == null ? '' : String(body.group_id).trim()
  const group_id = groupIdRaw || null
  const errors = []
  if (!content) errors.push('内容不能为空')
  else if (content.length > 500) errors.push('内容不能超过 500 字')
  if (mood.length > 16) errors.push('心情 emoji 过长')
  if (color.length > 32) errors.push('颜色值过长')
  return { errors, content, mood, color, group_id }
}

// 反应类型白名单
export const ALLOWED_REACTION_TYPES = new Set(['like', 'hug'])
