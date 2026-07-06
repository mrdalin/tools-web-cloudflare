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
  const resp = await axios.post(
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

  return resp.data?.choices?.[0]?.message?.content?.trim() || ''
}
