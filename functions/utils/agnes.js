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
