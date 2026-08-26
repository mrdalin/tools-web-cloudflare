import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'
import { fetchWithRetry, friendlyAgnesError, getAgnesAuthorization, missingAgnesKeyResponse } from '../utils/agnes.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(origin)
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const url = new URL(request.url)
    const videoId = url.searchParams.get('video_id')

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'video_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const authHeader = getAgnesAuthorization(request, env)

    if (!authHeader) {
      return missingAgnesKeyResponse(corsHeaders)
    }

    const response = await fetchWithRetry(
      `https://api.agnes-ai.cn/agnesapi?video_id=${encodeURIComponent(videoId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      },
      {
        attempts: 3,
        timeoutMs: 30_000
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
