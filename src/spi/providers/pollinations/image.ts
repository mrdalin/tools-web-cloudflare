import { ImageOptions, ImageResponse } from '../../common/interfaces'

export async function generateImage(
  this: any,
  prompt: string, 
  options?: ImageOptions
): Promise<ImageResponse> {
  const model = options?.model || 'agnes-image-2.1-flash'
  const width = options?.width || 1024
  const height = options?.height || 1024

  const response = await fetch('/api/agnes-image-generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      size: `${width}x${height}`,
      extra_body: {
        response_format: 'url'
      }
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || '图片生成失败')
  }

  const data = await response.json()
  const url = data.data?.[0]?.url

  if (!url) {
    throw new Error('图片生成接口没有返回图片地址')
  }

  return {
    url,
    model,
    metadata: {
      width,
      height
    }
  }
}
