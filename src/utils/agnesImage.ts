import axios from 'axios'

export interface GenerateAgnesImageOptions {
  prompt: string
  model?: string
  width?: number
  height?: number
  size?: string
  images?: string[]
  count?: number
  timeout?: number
  signal?: AbortSignal
}

export class AgnesImageError extends Error {
  status?: number
  retryAfterSeconds?: number

  constructor(message: string, status?: number, retryAfterSeconds?: number) {
    super(message)
    this.name = 'AgnesImageError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function getImageError(error: any): AgnesImageError {
  const status = error?.response?.status
  const data = error?.response?.data

  if (status === 429) {
    const retryAfter = data?.error?.retry_after ?? error.response.headers?.['retry-after']
    const seconds = /^\d+$/.test(String(retryAfter)) ? Number(retryAfter) : NaN
    return new AgnesImageError(
      '图像服务请求过于频繁，请稍后重试',
      status,
      Number.isFinite(seconds) ? Math.max(1, seconds) : 60
    )
  }

  if (status === 401 || status === 403) {
    return new AgnesImageError('图像服务认证失败，请联系站点管理员', status)
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new AgnesImageError('图片生成超时，请稍后重试', status)
  }

  const message = data?.error?.message
    || (typeof data?.error === 'string' ? data.error : '')
    || data?.message
    || (typeof data?.detail === 'string' ? data.detail : '')

  return new AgnesImageError(
    typeof message === 'string' && message.trim()
      ? message
      : status
        ? '图片生成服务暂时不可用，请稍后重试'
        : '网络连接失败，请检查网络后重试',
    status
  )
}

export async function generateAgnesImages(options: GenerateAgnesImageOptions): Promise<string[]> {
  const size = options.size || `${options.width || 1024}x${options.height || 1024}`
  const extraBody: Record<string, unknown> = {
    response_format: 'url'
  }

  if (options.images?.length) {
    extraBody.image = options.images
  }

  let resp
  try {
    resp = await axios.post(
      '/api/agnes-image-generations',
      {
        model: options.model || 'agnes-image-2.5-flash',
        prompt: options.prompt,
        size,
        ...(options.count ? { n: options.count } : {}),
        extra_body: extraBody
      },
      {
        timeout: options.timeout || 120000,
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error: any) {
    throw getImageError(error)
  }

  const images = (Array.isArray(resp.data?.data) ? resp.data.data : [])
    .map((item: any) => item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : ''))
    .filter((url: unknown): url is string => typeof url === 'string' && !!url.trim())

  if (!images.length) {
    throw new Error('图片生成结果为空，请稍后重试')
  }

  return images
}
