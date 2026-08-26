import { getCORSHeaders } from '../utils/cors.js'
import { fetchWithRetry, friendlyAgnesError, getAgnesAuthorization, missingAgnesKeyResponse } from '../utils/agnes.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const body = await request.text()
    const authHeader = getAgnesAuthorization(request, env)

    if (!authHeader) {
      return missingAgnesKeyResponse(corsHeaders)
    }

    let parsedBody = {}
    try {
      parsedBody = JSON.parse(body)
    } catch {}

    const response = await fetchWithRetry(
      'https://api.agnes-ai.cn/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body
      },
      {
        attempts: parsedBody?.stream === true ? 2 : 3,
        timeoutMs: parsedBody?.stream === true ? 30_000 : 60_000
      }
    )

    // 流式透传：直接将上游 ReadableStream 转发给客户端，不缓存
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
        ...corsHeaders,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    const friendly = friendlyAgnesError(error)
    return new Response(JSON.stringify({ error: { message: friendly.message, detail: error.message } }), {
      status: friendly.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
