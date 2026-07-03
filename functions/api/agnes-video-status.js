import { getCORSHeaders } from '../utils/cors.js'

export async function onRequest(context) {
  const { request } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

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

    const authHeader = request.headers.get('Authorization')

    const response = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || ''
      }
    })

    const result = await response.text()

    return new Response(result, {
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
