import axios from 'axios'

export type AIChatRole = 'system' | 'user' | 'assistant'

export interface AIChatMessage {
  role: AIChatRole
  content: string
}

export interface GenerateAITextOptions {
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export async function generateAIText(
  messages: AIChatMessage[],
  options: GenerateAITextOptions = {}
): Promise<string> {
  let resp
  try {
    resp = await axios.post(
      '/api/ai-chat',
      {
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: false
      },
      {
        timeout: options.timeout ?? 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error: any) {
    const message = error?.response?.data?.error?.message
      || (typeof error?.response?.data?.error === 'string' ? error.response.data.error : '')
      || 'AI 服务暂时不稳定，请稍后重试'
    throw new Error(message)
  }

  const content = resp.data?.choices?.[0]?.message?.content?.trim() || ''
  if (!content) {
    throw new Error('AI 返回内容为空，请稍后重试')
  }

  return content
}
