import { ResumeRouter } from '../../routes/resume.js'

import { getCORSHeaders } from '../../utils/cors.js'

export async function onRequest(context) {
  const { request, env, params } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)
  const path = `/${params.id}`

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      }
    })
  }

  try {
    const resumeRouter = new ResumeRouter(env.DB)
    return await resumeRouter.handle(request, path, env, origin)
  } catch (error) {
    console.error('简历API错误:', error)
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
