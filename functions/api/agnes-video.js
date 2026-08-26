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

    const response = await fetchWithRetry(
      'https://apihub.agnes-ai.com/v1/videos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body
      },
      {
        attempts: 3,
        timeoutMs: 90_000
      }
    )

    const result = await response.text()

    return new Response(result, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
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
