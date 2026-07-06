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
