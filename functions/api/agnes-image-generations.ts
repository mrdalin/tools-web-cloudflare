import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'
import { AGNES_BASE_URL, AGNES_IMAGE_MODEL, agnesRateLimitResponse, fetchWithRetry, friendlyAgnesError, getAgnesAuthorization, missingAgnesKeyResponse } from '../utils/agnes.js'

export async function onRequest(context: any) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(origin)
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const body = await request.json()
    const authHeader = getAgnesAuthorization(request, env)

    if (!authHeader) {
      return missingAgnesKeyResponse(corsHeaders)
    }

    const response = await fetchWithRetry(
      `${AGNES_BASE_URL}/v1/images/generations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ ...body, model: AGNES_IMAGE_MODEL })
      },
      {
        attempts: 3,
        retryOnRateLimit: false,
        timeoutMs: 90_000
      }
    )

    if (response.status === 429) {
      return await agnesRateLimitResponse(response, corsHeaders, '图像')
    }

    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: { message: text || 'Agnes returned an empty response' } }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error: any) {
    const friendly = friendlyAgnesError(error)
    return new Response(JSON.stringify({ error: { message: friendly.message, detail: error.message } }), {
      status: friendly.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
