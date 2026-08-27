// AI 图片编辑（Agnes 底座）
// POST /api/ai-image-edit
// Content-Type: multipart/form-data
// Fields: prompt(必填), size(可选，默认 1024x1024), images(file[], 可选，最多 16 张), image(兼容旧单图字段)
// 有图 → 图生图；无图 → 文生图。全部走 Agnes agnes-image-2.1-flash。
import { getCORSHeaders, handleCORSPreflight } from '../utils/cors.js'
import { fetchWithRetry, friendlyAgnesError, getAgnesAuthorization, missingAgnesKeyResponse } from '../utils/agnes.js'

const AGNES_IMAGE_MODEL = 'agnes-image-2.1-flash'
const AGNES_IMAGE_URL = 'https://apihub.agnes-ai.com/v1/images/generations'
const MAX_INPUT_IMAGES = 16

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

// File → base64 data URL（Agnes extra_body.image 需要 data: URL 形式）
async function fileToDataUrl(file) {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return `data:${file.type || 'image/png'};base64,${btoa(binary)}`
}

// 从 Agnes 响应提取第一张图片 URL
function extractUrl(data) {
  const items = Array.isArray(data?.data) ? data.data : []
  const first = items[0] || {}
  if (first?.url) return first.url
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`
  if (data?.url) return data.url
  return ''
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  const corsHeaders = getCORSHeaders(origin)

  if (request.method === 'OPTIONS') return handleCORSPreflight(origin)
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, corsHeaders)

  const authHeader = getAgnesAuthorization(request, env)
  if (!authHeader) return missingAgnesKeyResponse(corsHeaders)

  let formData
  try {
    formData = await request.formData()
  } catch {
    return json({ ok: false, error: '请求格式错误，需要 multipart/form-data' }, 400, corsHeaders)
  }

  const prompt = (formData.get('prompt')?.toString() || '').trim().slice(0, 5000)
  if (!prompt) return json({ ok: false, error: '请输入提示词' }, 400, corsHeaders)

  const size = (formData.get('size')?.toString() || '').trim() || '1024x1024'

  let files = formData.getAll('images').filter((f) => f && f instanceof File && f.size > 0)
  if (files.length === 0) {
    const legacy = formData.get('image')
    if (legacy && legacy instanceof File && legacy.size > 0) files = [legacy]
  }
  if (files.length > MAX_INPUT_IMAGES) files = files.slice(0, MAX_INPUT_IMAGES)

  const images = []
  for (const file of files) {
    images.push(await fileToDataUrl(file))
  }

  const body = {
    model: AGNES_IMAGE_MODEL,
    prompt,
    size,
    extra_body: {
      response_format: 'url',
      ...(images.length ? { image: images } : {})
    }
  }

  try {
    const resp = await fetchWithRetry(
      AGNES_IMAGE_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(body)
      },
      { attempts: 3, timeoutMs: 120_000 }
    )

    const text = await resp.text()
    let data
    try { data = text ? JSON.parse(text) : {} } catch { data = { error: { message: text || 'Agnes 返回空响应' } } }

    if (!resp.ok) {
      const msg = data?.error?.message || (typeof data?.error === 'string' ? data.error : '') || `上游错误 ${resp.status}`
      return json({ ok: false, error: msg }, resp.status, corsHeaders)
    }

    const url = extractUrl(data)
    if (!url) return json({ ok: false, error: '上游返回成功但未找到图片数据' }, 502, corsHeaders)

    return json({ ok: true, data: { url } }, 200, corsHeaders)
  } catch (error) {
    const friendly = friendlyAgnesError(error)
    return json({ ok: false, error: friendly.message }, friendly.status, corsHeaders)
  }
}
