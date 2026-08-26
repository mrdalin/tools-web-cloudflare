import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'
import { fetchWithRetry } from '../utils/agnes.js'

const AGNES_CHAT_URL = 'https://apihub.agnes-ai.com/v1/chat/completions'
const POLLINATIONS_CHAT_URL = 'https://text.pollinations.ai/v1/chat/completions'
const AGNES_MODEL = 'agnes-2.5-flash'
const POLLINATIONS_MODEL = 'openai-fast'
const MAX_MESSAGES = 30
const MAX_CONTENT_LENGTH = 12000
const MAX_REQUESTS_PER_MINUTE = 30
const NON_STREAM_TOTAL_TIMEOUT_MS = 55_000
const AGNES_PRIMARY_TIMEOUT_MS = 20_000

const rateBuckets = new Map()

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders(origin)
    }
  })
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
}

function isRateLimited(request) {
  const ip = getClientIp(request)
  const now = Date.now()
  const windowStart = now - 60_000
  const hits = (rateBuckets.get(ip) || []).filter((timestamp) => timestamp > windowStart)

  if (hits.length >= MAX_REQUESTS_PER_MINUTE) {
    rateBuckets.set(ip, hits)
    return true
  }

  hits.push(now)
  rateBuckets.set(ip, hits)

  if (rateBuckets.size > 1000) {
    for (const [key, value] of rateBuckets.entries()) {
      const freshHits = value.filter((timestamp) => timestamp > windowStart)
      if (freshHits.length) rateBuckets.set(key, freshHits)
      else rateBuckets.delete(key)
    }
  }

  return false
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'messages must be a non-empty array' }
  }

  if (messages.length > MAX_MESSAGES) {
    return { error: `messages cannot exceed ${MAX_MESSAGES}` }
  }

  const sanitized = []
  for (const message of messages) {
    const role = message?.role
    const content = typeof message?.content === 'string' ? message.content.trim() : ''

    if (!['system', 'user', 'assistant'].includes(role)) {
      return { error: 'message role is invalid' }
    }

    if (!content) {
      return { error: 'message content cannot be empty' }
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return { error: `message content cannot exceed ${MAX_CONTENT_LENGTH} characters` }
    }

    sanitized.push({ role, content })
  }

  return { messages: sanitized }
}

function buildPayload(body, model) {
  const payload = {
    model,
    messages: body.messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    stream: body.stream === true
  }

  if (Number.isInteger(body.max_tokens)) {
    payload.max_tokens = Math.min(Math.max(body.max_tokens, 1), 4000)
  }

  return payload
}

function getProviderError(provider, response, text) {
  return `${provider} failed with ${response.status}: ${text.slice(0, 200)}`
}

async function callProvider({ provider, url, apiKey, payload, timeoutMs, attempts }) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    },
    {
      attempts: attempts ?? (payload.stream ? 2 : 3),
      timeoutMs
    }
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(getProviderError(provider, response, text))
  }

  return response
}

function streamResponse(response, provider, origin) {
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-AI-Provider': provider,
      ...getCORSHeaders(origin)
    }
  })
}

async function jsonProviderResponse(response, provider, origin) {
  const data = await response.json()

  if (provider === 'agnes') {
    const choice = data?.choices?.[0]
    const content = typeof choice?.message?.content === 'string'
      ? choice.message.content.trim()
      : ''

    if (!content || choice?.finish_reason === 'length') {
      throw new Error(`agnes returned an unusable response: ${!content ? 'empty content' : 'length limit'}`)
    }
  }

  return jsonResponse({ ...data, provider }, 200, origin)
}

export async function callWithFallback(body, env, request, origin) {
  const timeoutMs = Number.isInteger(body.timeout_ms) ? Math.min(body.timeout_ms, 60_000) : 60_000
  const deadline = Date.now() + Math.min(timeoutMs, NON_STREAM_TOTAL_TIMEOUT_MS)
  const providers = []
  if (env.AGNES_API_KEY) {
    providers.push({
      name: 'agnes',
      url: AGNES_CHAT_URL,
      apiKey: env.AGNES_API_KEY,
      model: AGNES_MODEL
    })
  }

  providers.push({
    name: 'pollinations',
    url: POLLINATIONS_CHAT_URL,
    apiKey: env.POLLINATIONS_API_KEY,
    model: POLLINATIONS_MODEL
  })

  let lastError
  for (const provider of providers) {
    try {
      const payload = buildPayload(body, provider.model)
      const remainingMs = Math.max(1_000, deadline - Date.now())
      const providerTimeoutMs = body.stream === true
        ? timeoutMs
        : provider.name === 'agnes'
          ? Math.min(remainingMs, AGNES_PRIMARY_TIMEOUT_MS)
          : remainingMs
      const response = await callProvider({
        provider: provider.name,
        url: provider.url,
        apiKey: provider.apiKey,
        payload,
        timeoutMs: providerTimeoutMs,
        attempts: body.stream === true ? 2 : 1
      })

      if (body.stream === true) {
        return streamResponse(response, provider.name, origin)
      }

      return await jsonProviderResponse(response, provider.name, origin)
    } catch (error) {
      lastError = error
      console.warn(`${provider.name} chat request failed, trying fallback`, error.message)
    }
  }

  return jsonResponse({ error: 'AI service unavailable', detail: lastError?.message || 'unknown error' }, 502, origin)
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(origin)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  if (isRateLimited(request)) {
    return jsonResponse({ error: 'Too many requests' }, 429, origin)
  }

  try {
    const body = await request.json()
    const validation = validateMessages(body.messages)

    if (validation.error) {
      return jsonResponse({ error: validation.error }, 400, origin)
    }

    const normalizedBody = {
      ...body,
      messages: validation.messages
    }

    return await callWithFallback(normalizedBody, env, request, origin)
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'AI request timed out' : 'Invalid request'
    return jsonResponse({ error: message }, error?.name === 'AbortError' ? 504 : 400, origin)
  }
}
