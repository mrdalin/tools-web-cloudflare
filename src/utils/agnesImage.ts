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

export async function generateAgnesImages(options: GenerateAgnesImageOptions): Promise<string[]> {
  const size = options.size || `${options.width || 1024}x${options.height || 1024}`
  const extraBody: Record<string, unknown> = {
    response_format: 'url'
  }

  if (options.images?.length) {
    extraBody.image = options.images
  }

  const resp = await axios.post(
    '/api/agnes-image-generations',
    {
      model: options.model || 'agnes-image-2.1-flash',
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

  const images = (resp.data?.data || [])
    .map((item: any) => item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : ''))
    .filter(Boolean)

  if (!images.length) {
    throw new Error('No image returned from Agnes')
  }

  return images
}
