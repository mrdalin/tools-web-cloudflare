import { getCORSHeaders, handleCORSPreflight, isOriginAllowed } from '../utils/cors.js'

const MAX_BASE64_LENGTH = 8 * 1024 * 1024

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(origin)
  }

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'CORS origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  if (!env.IMGBB_API_KEY) {
    return new Response(JSON.stringify({ error: 'Image upload service is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (typeof image !== 'string' || !image) {
      return new Response(JSON.stringify({ error: 'Missing image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (image.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: 'Image is too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const uploadData = new FormData()
    uploadData.set('image', image)

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`, {
      method: 'POST',
      body: uploadData
    })

    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Image upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
