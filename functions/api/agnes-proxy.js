import { getCORSHeaders } from '../utils/cors.js'
import { AGNES_BASE_URL, AGNES_CHAT_MODEL, AGNES_IMAGE_MODEL, AGNES_VIDEO_MODEL, agnesTextRateLimitResponse } from '../utils/agnes.js'

export async function onRequest(context) {
  const { request } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = await request.json()
    const { endpoint, ...data } = body
    if (!endpoint || typeof endpoint !== 'string' || !/^[a-zA-Z0-9/_-]+$/.test(endpoint)) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const models = {
      'chat/completions': AGNES_CHAT_MODEL,
      responses: AGNES_CHAT_MODEL,
      messages: AGNES_CHAT_MODEL,
      'images/generations': AGNES_IMAGE_MODEL,
      videos: AGNES_VIDEO_MODEL
    }
    if (Object.hasOwn(models, endpoint)) data.model = models[endpoint]

    const agnesUrl = `${AGNES_BASE_URL}/v1/${endpoint}`
    const authHeader = request.headers.get('Authorization')

    const response = await fetch(agnesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      },
      body: JSON.stringify(data)
    })

    if (models[endpoint] === AGNES_CHAT_MODEL && response.status === 429) {
      return await agnesTextRateLimitResponse(response, corsHeaders)
    }

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
