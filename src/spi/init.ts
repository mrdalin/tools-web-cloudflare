import { aiManager } from './index'
import { createPollinationsProvider } from './providers/pollinations'
import { createAiToolsProvider } from './providers/aitools'

export function initializeAIProviders() {
  const proxyUrl = import.meta.env.VITE_POLLINATIONS_PROXY_URL || ''
  const textUrl = import.meta.env.VITE_POLLINATIONS_TEXT_URL || ''
  const imageUrl = import.meta.env.VITE_POLLINATIONS_URL || ''

  if (proxyUrl && textUrl && imageUrl) {
    const pollinations = createPollinationsProvider({
      apiKey: '',
      proxyUrl,
      textUrl,
      imageUrl
    })
    aiManager.registerProvider('pollinations', pollinations)
    console.log('Pollinations AI provider registered')
  } else {
    console.warn('Pollinations AI provider is missing proxy or endpoint configuration')
  }

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
