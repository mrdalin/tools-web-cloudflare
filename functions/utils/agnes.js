export const AGNES_BASE_URL = 'https://api.agnes-ai.cn'
export const AGNES_CHAT_MODEL = 'agnes-3.0-flash'
export const AGNES_IMAGE_MODEL = 'agnes-image-2.5-flash'
export const AGNES_VIDEO_MODEL = 'agnes-video-2.5-flash'

export function getAgnesAuthorization(request, env) {
  if (env?.AGNES_API_KEY) return `Bearer ${env.AGNES_API_KEY}`
  const header = request.headers.get('Authorization') || ''
  if (/^Bearer\s+\S+/i.test(header)) return header
  return ''
}

export function missingAgnesKeyResponse(corsHeaders) {
  return new Response(JSON.stringify({ error: { message: 'AGNES_API_KEY is not configured' } }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error) {
  return error?.name === 'AbortError' || error instanceof TypeError
}

function retryDelayMs(attempt, response) {
  const retryAfter = response?.headers?.get('Retry-After')
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : 0
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 5000)
  }

  return Math.min(500 * (2 ** attempt), 3000) + Math.floor(Math.random() * 250)
}

export function friendlyAgnesError(error) {
  if (error?.name === 'AbortError') {
    return { status: 504, message: 'AI 服务响应超时，请稍后重试' }
  }

  return { status: 502, message: 'AI 服务暂时不稳定，请稍后重试' }
}

export function agnesTextRateLimitResponse(response, corsHeaders) {
  return agnesRateLimitResponse(response, corsHeaders, '文本')
}

export async function agnesRateLimitResponse(response, corsHeaders, serviceLabel) {
  const retryAfter = (response.headers.get('Retry-After') || '').trim()
  const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : NaN
  const retryAt = /^[A-Za-z]/.test(retryAfter) ? Date.parse(retryAfter) : NaN
  const retryAfterSeconds = Number.isFinite(seconds)
    ? Math.max(1, Math.ceil(seconds))
    : Number.isFinite(retryAt)
      ? Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))
      : 60

  await response.body?.cancel().catch(() => {})

  return new Response(JSON.stringify({
    error: {
      code: 'rate_limit_exceeded',
      message: `${serviceLabel}服务请求过于频繁，请在 ${retryAfterSeconds} 秒后重试`,
      retry_after: retryAfterSeconds
    }
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Retry-After': String(retryAfterSeconds),
      ...corsHeaders
    }
  })
}

export async function fetchWithRetry(url, options = {}, config = {}) {
  const attempts = Math.max(1, config.attempts || 3)
  const timeoutMs = Math.min(Math.max(config.timeoutMs || 45_000, 1_000), 120_000)
  let lastError

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController()
    let timeoutId
    let abortHandler

    if (options.signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError')
    }

    if (options.signal) {
      abortHandler = () => controller.abort()
      options.signal.addEventListener('abort', abortHandler, { once: true })
    }

    try {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      if (
        !response.ok
        && RETRYABLE_STATUS.has(response.status)
        && (response.status !== 429 || config.retryOnRateLimit !== false)
        && attempt < attempts - 1
      ) {
        await response.body?.cancel?.()
        await sleep(retryDelayMs(attempt, response))
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (!isRetryableError(error) || attempt >= attempts - 1) {
        throw error
      }
      await sleep(retryDelayMs(attempt))
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      if (options.signal && abortHandler) {
        options.signal.removeEventListener('abort', abortHandler)
      }
    }
  }

  throw lastError || new Error('AI request failed')
}
