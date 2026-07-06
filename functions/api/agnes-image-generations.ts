import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'
import { getAgnesAuthorization, missingAgnesKeyResponse } from '../utils/agnes.js'

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

    const response = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
