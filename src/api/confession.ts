// 匿名告白墙 API 封装
// 后端：functions/api/confession/*

import { functionsRequest } from '@/utils/functionsRequest'

/**
 * 后端统一返回 { success: true, data }；错误走 4xx/5xx，由 functionsRequest 的
 * axios 拦截器统一 toast 并 reject。这里只在 2xx 时校验 success 并解包 data。
 */
function unwrap<T>(res: { data?: { success?: boolean; data?: T; error?: string } }): T {
  const body = res.data
  if (!body || body.success !== true) {
    const msg = body?.error || '请求失败'
    const err: any = new Error(msg)
    err.response = { data: body }
    throw err
  }
  return body.data as T
}

// ============ 类型 ============

export interface ConfessionGroup {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
  description: string | null
  sort_order: number
  is_default: boolean
  created_at: string
}

export interface ConfessionMessage {
  id: string
  group_id: string | null
  content: string
  mood: string | null
  color: string | null
  likes_count: number
  hugs_count: number
  created_at: string
}

export interface ConfessionMessageList {
  messages: ConfessionMessage[]
  total: number
}

export type ReactionType = 'like' | 'hug'

export interface ReactionRecord {
  message_id: string
  reaction_type: ReactionType
}

export interface ReactionToggleResult {
  reacted: boolean
  likes_count: number
  hugs_count: number
}

// ============ 分组 ============

export async function fetchGroups(): Promise<ConfessionGroup[]> {
  const res = await functionsRequest.get('/api/confession/groups')
  return unwrap<ConfessionGroup[]>(res)
}

export async function createGroup(input: {
  name: string
  icon?: string
  color?: string
  description?: string
}): Promise<ConfessionGroup> {
  const res = await functionsRequest.post('/api/confession/groups', input)
  return unwrap<ConfessionGroup>(res)
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await functionsRequest.delete(`/api/confession/groups/${id}`)
  unwrap<unknown>(res)
}

// ============ 消息 ============

export async function fetchMessages(
  groupId: string,
  params: { sort?: 'latest' | 'hot'; before?: string; limit?: number } = {},
): Promise<ConfessionMessageList> {
  const res = await functionsRequest.get(`/api/confession/groups/${groupId}/messages`, { params })
  return unwrap<ConfessionMessageList>(res)
}

export async function sendMessage(input: {
  content: string
  mood: string
  color: string
  group_id: string | null
}): Promise<ConfessionMessage> {
  const res = await functionsRequest.post('/api/confession/messages', input)
  return unwrap<ConfessionMessage>(res)
}

export async function deleteMessage(id: string): Promise<void> {
  const res = await functionsRequest.delete(`/api/confession/messages/${id}`)
  unwrap<unknown>(res)
}

// ============ 反应 ============

export async function fetchMyReactions(userFingerprint: string): Promise<ReactionRecord[]> {
  const res = await functionsRequest.get('/api/confession/reactions', {
    params: { user_fingerprint: userFingerprint },
  })
  return unwrap<ReactionRecord[]>(res)
}

export async function toggleReaction(
  messageId: string,
  reactionType: ReactionType,
  userFingerprint: string,
): Promise<ReactionToggleResult> {
  const res = await functionsRequest.post(`/api/confession/messages/${messageId}/reactions`, {
    reaction_type: reactionType,
    user_fingerprint: userFingerprint,
  })
  return unwrap<ReactionToggleResult>(res)
}
