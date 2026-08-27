// AI 穿搭（Agnes 底座）
// POST /api/ai-outfit
// Content-Type: multipart/form-data
// Fields:
//   - personImages(file[], 必填 ≥1) 人物照；兼容旧字段 personImage
//   - clothingImages(file[], 可选) 衣物照；兼容旧字段 clothingImage
//   - style(string, 可选) 风格/场景提示词
//   - size(string, 可选，默认 1024x1024)
// 有衣物照 → 换装（outfit-replace）；无衣物照 → 自动设计穿搭（outfit-generate）。
// 全部走 Agnes agnes-image-2.1-flash，多图按 person → clothing 顺序传入 extra_body.image。
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

function extractUrl(data) {
  const items = Array.isArray(data?.data) ? data.data : []
  const first = items[0] || {}
  if (first?.url) return first.url
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`
  if (data?.url) return data.url
  return ''
}

function buildGeneratePrompt(styleText) {
  const userStyle = styleText && styleText.trim() ? styleText.trim() : '时髦、得体、百搭'
  return [
    '请为照片中的人物设计一套完整、时尚、风格协调的穿搭。',
    '要求：',
    '- 保持人物的面部特征、五官、表情、发型、姿态、肤色完全不变；',
    '- 如果提供了多张人物照，请综合考虑每张图里人物的姿态、角度、可见的身体部位（不要因为多张图就误判为多个人）；',
    '- 保持背景完全不变；',
    '- 只替换 / 添加衣物，包括上衣、下装、鞋子、外套、配饰（帽子、包、首饰等）；',
    `- 整体风格遵循用户指示：${userStyle}；`,
    '- 输出照片级真实感的高清人像，主体居中、姿态自然。'
  ].join('\n')
}

function buildReplacePrompt(styleText) {
  const userStyle = styleText && styleText.trim() ? `\n- 用户风格偏好：${styleText.trim()}；` : ''
  return [
    '请把人物照中人物的衣物替换为衣物照里展示的衣物。',
    '说明：',
    '- 可能有多张人物照，它们展示的是同一个人（不同角度 / 姿态 / 部位）；综合考虑所有人物照，保持人物的面部特征、五官、表情、发型、肤色、姿态、背景完全不变；',
    '- 可能有多张衣物照，它们是要被穿上的若干单品（上下装、鞋子、配饰等）；',
    '要求：',
    '- 把衣物照中的每件衣物「穿到」人物身上，自动适配人物的身材和姿态，包含合理的褶皱、光影、贴合度；',
    '- 衣物照中已覆盖到的部位用对应衣物替换；衣物照里没有覆盖到的部位保留人物原有穿着或按风格补全；' + userStyle,
    '- 输出照片级真实感的高清人像。'
  ].join('\n')
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

  let personFiles = formData.getAll('personImages').filter((f) => f && f instanceof File && f.size > 0)
  if (personFiles.length === 0) {
    const legacy = formData.get('personImage')
    if (legacy && legacy instanceof File && legacy.size > 0) personFiles = [legacy]
  }
  let clothingFiles = formData.getAll('clothingImages').filter((f) => f && f instanceof File && f.size > 0)
  if (clothingFiles.length === 0) {
    const legacy = formData.get('clothingImage')
    if (legacy && legacy instanceof File && legacy.size > 0) clothingFiles = [legacy]
  }

  const style = (formData.get('style')?.toString() || '').trim().slice(0, 5000)
  const size = (formData.get('size')?.toString() || '').trim() || '1024x1024'

  if (personFiles.length === 0) {
    return json({ ok: false, error: '请上传人物照' }, 400, corsHeaders)
  }

  // 上限：人物 + 衣物合计 ≤ 16，优先保留人物照
  let total = personFiles.length + clothingFiles.length
  if (total > MAX_INPUT_IMAGES) {
    const overflow = total - MAX_INPUT_IMAGES
    if (clothingFiles.length >= overflow) {
      clothingFiles = clothingFiles.slice(0, Math.max(0, clothingFiles.length - overflow))
    } else {
      const personOverflow = overflow - clothingFiles.length
      personFiles = personFiles.slice(0, Math.max(0, personFiles.length - personOverflow))
      clothingFiles = []
    }
  }

  const hasClothing = clothingFiles.length > 0
  const prompt = hasClothing ? buildReplacePrompt(style) : buildGeneratePrompt(style)

  // 顺序：人物照 → 衣物照
  const images = []
  for (const file of personFiles) images.push(await fileToDataUrl(file))
  for (const file of clothingFiles) images.push(await fileToDataUrl(file))

  const body = {
    model: AGNES_IMAGE_MODEL,
    prompt,
    size,
    extra_body: {
      response_format: 'url',
      image: images
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
