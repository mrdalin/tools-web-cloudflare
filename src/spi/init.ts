import { aiManager } from './index'
import { createPollinationsProvider } from './providers/pollinations'
import { createAiToolsProvider } from './providers/aitools'

export function initializeAIProviders() {
  const agnes = createPollinationsProvider({
    apiKey: '',
    proxyUrl: '',
    textUrl: '',
    imageUrl: ''
  })
  aiManager.registerProvider('pollinations', agnes)
  console.log('Agnes AI provider registered')

  const proxyUrl = import.meta.env.VITE_POLLINATIONS_PROXY_URL || ''
  if (proxyUrl && import.meta.env.VITE_ENABLE_AITOOLS === 'true') {
    const aitools = createAiToolsProvider({
      apiKey: '',
      proxyUrl
    })
    aiManager.registerProvider('aitools', aitools)
    console.log('AiTools AI provider registered')
  }

  const providers = aiManager.getAllProviders()
  console.log('Registered AI providers:', providers.map(p => p.name))
}
