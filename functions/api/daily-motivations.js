import { callWithFallback } from './ai-chat.js'
import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'

const ALLOWED_STYLES = new Set(['励志', '情感', '成长', '职场', '学习', '生活', '友情', '爱情'])
const MAX_COUNT = 10
const MAX_SEEN_IDS = 10000
const MAX_SEEN_ID_LENGTH = 64
const LOCK_TTL_MS = 60_000
const RATE_LIMIT_WINDOW_MS = 10 * 60_000
const RATE_LIMIT_MAX_GENERATIONS = 3
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60_000

function jsonResponse(data, status, origin, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders(origin),
      ...extraHeaders
    }
  })
}

function normalizeRecord(row) {
  return {
    id: row.id,
    style: row.style,
    content: row.content,
    createdAt: row.created_at
  }
}

async function getPool(db, style) {
  const result = await db.prepare(`
    SELECT id, style, content, created_at
    FROM ai_daily_motivations
    WHERE style = ?
    ORDER BY RANDOM()
  `).bind(style).all()

  return (result.results || []).map(normalizeRecord)
}

function validateStyle(style) {
  return typeof style === 'string' && ALLOWED_STYLES.has(style)
}

function validateGenerationBody(body) {
  if (!validateStyle(body?.style)) return 'style is invalid'
  if (!Number.isInteger(body?.count) || body.count < 1 || body.count > MAX_COUNT) {
    return `count must be an integer between 1 and ${MAX_COUNT}`
  }
  if (!Array.isArray(body?.seenIds) || body.seenIds.length > MAX_SEEN_IDS) {
    return `seenIds must be an array with at most ${MAX_SEEN_IDS} items`
  }
  if (body.seenIds.some(id => typeof id !== 'string' || !id)) {
    return 'seenIds must contain non-empty strings'
  }
  if (body.seenIds.some(id => id.length > MAX_SEEN_ID_LENGTH)) {
    return `seenIds entries must be at most ${MAX_SEEN_ID_LENGTH} characters`
  }
  return null
}

function createPrompt(style, count) {
  const requestCount = Math.min(Math.max(count * 2, 5), 20)
  const seed = Math.floor(Math.random() * 100000000)

  return `请生成${requestCount}条${style}风格的励志鸡汤文，要求：
1. 每条鸡汤文要简洁有力，字数控制在30-50字之间
2. 内容要积极向上，富有哲理和启发性
3. 风格要符合“${style}”主题
4. 每条鸡汤文单独一行，不要编号，不要标点符号结尾
5. 只输出鸡汤文内容，不要其他解释文字

随机种子：${seed}`
}

function parseGeneratedLines(content, existingContents) {
  const uniqueContents = new Set(existingContents)
  const lines = []

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine
      .trim()
      .replace(/^(?:\d+[.、)]|[-*•])\s*/, '')
      .trim()

    if (line.length < 10 || line.length > 100 || uniqueContents.has(line)) continue
    uniqueContents.add(line)
    lines.push(line)
  }

  return lines
}

async function acquireLock(db, style, lockedUntil, now) {
  const result = await db.prepare(`
    INSERT INTO ai_daily_motivation_generation_locks (style, locked_until)
    VALUES (?, ?)
    ON CONFLICT(style) DO UPDATE SET locked_until = excluded.locked_until
    WHERE ai_daily_motivation_generation_locks.locked_until <= ?
  `).bind(style, lockedUntil, now).run()

  return (result.meta?.changes ?? result.changes ?? 0) > 0
}

async function releaseLock(db, style, lockedUntil) {
  await db.prepare(`
    DELETE FROM ai_daily_motivation_generation_locks
    WHERE style = ? AND locked_until = ?
  `).bind(style, lockedUntil).run()
}

function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  ).slice(0, 128)
}

async function getDailyClientKey(request, now) {
  const date = new Date(now).toISOString().slice(0, 10)
  const input = new TextEncoder().encode(`${date}:${getClientIp(request)}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input))
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function consumeGenerationQuota(db, request, now) {
  const clientKey = await getDailyClientKey(request, now)
  const windowStartedAt = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS
  const result = await db.prepare(`
    INSERT INTO ai_daily_motivation_generation_rate_limits (
      client_key,
      window_started_at,
      generation_count,
      updated_at
    ) VALUES (?, ?, 1, ?)
    ON CONFLICT(client_key) DO UPDATE SET
      window_started_at = excluded.window_started_at,
      generation_count = CASE
        WHEN ai_daily_motivation_generation_rate_limits.window_started_at = excluded.window_started_at
          THEN ai_daily_motivation_generation_rate_limits.generation_count + 1
        ELSE 1
      END,
      updated_at = excluded.updated_at
    WHERE ai_daily_motivation_generation_rate_limits.window_started_at != excluded.window_started_at
      OR ai_daily_motivation_generation_rate_limits.generation_count < ?
  `).bind(
    clientKey,
    windowStartedAt,
    now,
    RATE_LIMIT_MAX_GENERATIONS
  ).run()

  await db.prepare(`
    DELETE FROM ai_daily_motivation_generation_rate_limits
    WHERE updated_at < ?
  `).bind(now - RATE_LIMIT_RETENTION_MS).run()

  return {
    allowed: (result.meta?.changes ?? result.changes ?? 0) > 0,
    retryAfter: Math.max(1, Math.ceil((windowStartedAt + RATE_LIMIT_WINDOW_MS - now) / 1000))
  }
}

async function generateRecords({ db, env, request, origin, style, count, seenIds }) {
  const now = Date.now()
  const lockedUntil = now + LOCK_TTL_MS
  const acquired = await acquireLock(db, style, lockedUntil, now)

  if (!acquired) {
    return { error: 'generation_in_progress', status: 409 }
  }

  try {
    const pool = await getPool(db, style)
    if (pool.some(record => !seenIds.has(record.id))) {
      return { error: 'pool_not_exhausted', status: 409 }
    }

    const quota = await consumeGenerationQuota(db, request, now)
    if (!quota.allowed) {
      return {
        error: 'generation_rate_limited',
        status: 429,
        retryAfter: quota.retryAfter
      }
    }

    const providerResponse = await callWithFallback({
      messages: [{ role: 'user', content: createPrompt(style, count) }],
      max_tokens: 2000,
      temperature: 0.9,
      stream: false,
      timeout_ms: 55_000
    }, env, request, origin)

    const providerData = await providerResponse.json()
    if (!providerResponse.ok) {
      throw new Error(providerData.detail || providerData.error || 'AI service unavailable')
    }

    const content = providerData?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('AI returned an invalid response')

    const lines = parseGeneratedLines(content, pool.map(record => record.content))
    if (lines.length === 0) throw new Error('AI returned no usable content')

    const records = []
    for (const [index, line] of lines.entries()) {
      const record = {
        id: crypto.randomUUID(),
        style,
        content: line,
        createdAt: Date.now() + index
      }
      const result = await db.prepare(`
        INSERT OR IGNORE INTO ai_daily_motivations (id, style, content, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(record.id, record.style, record.content, record.createdAt).run()

      if ((result.meta?.changes ?? result.changes ?? 0) > 0) records.push(record)
    }

    if (records.length === 0) throw new Error('AI returned only duplicate content')
    return { records: records.slice(0, count), storedCount: records.length }
  } finally {
    await releaseLock(db, style, lockedUntil)
  }
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') return handleCORSPreflight(origin)
  if (!env.DB) return jsonResponse({ error: 'Database unavailable' }, 500, origin)

  try {
    if (request.method === 'GET') {
      const style = new URL(request.url).searchParams.get('style')
      if (!validateStyle(style)) return jsonResponse({ error: 'style is invalid' }, 400, origin)

      const records = await getPool(env.DB, style)
      return jsonResponse({ records, source: 'pool' }, 200, origin)
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin)
    }

    const body = await request.json()
    const validationError = validateGenerationBody(body)
    if (validationError) return jsonResponse({ error: validationError }, 400, origin)

    const pool = await getPool(env.DB, body.style)
    const seenIds = new Set(body.seenIds)
    if (pool.some(record => !seenIds.has(record.id))) {
      return jsonResponse({ error: 'pool_not_exhausted' }, 409, origin)
    }

    const result = await generateRecords({
      db: env.DB,
      env,
      request,
      origin,
      style: body.style,
      count: body.count,
      seenIds
    })

    if (result.error) {
      return jsonResponse(
        { error: result.error },
        result.status,
        origin,
        result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}
      )
    }
    return jsonResponse({
      records: result.records,
      storedCount: result.storedCount,
      source: 'generated'
    }, 200, origin)
  } catch (error) {
    console.error('Daily motivation request failed', error)
    return jsonResponse({ error: 'Daily motivation request failed' }, 502, origin)
  }
}
