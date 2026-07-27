const STORAGE_KEY = 'youngbar:ai-daily-motivation-seen:v1'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function shuffle(items, random) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function selectUnseenMotivations(records, seenIds, count, random = Math.random) {
  const unseen = records.filter(record => !seenIds.has(record.id))
  return shuffle(unseen, random).slice(0, count)
}

export function getNextSeenIds({ previousSeenIds, displayedIds, generatedIds }) {
  if (generatedIds.length > 0) return new Set(displayedIds)
  return new Set([...previousSeenIds, ...displayedIds])
}

export function loadSeenIds(style) {
  const storage = getStorage()
  if (!storage) return new Set()

  try {
    const state = JSON.parse(storage.getItem(STORAGE_KEY) || '{}')
    const ids = Array.isArray(state[style]) ? state[style] : []
    return new Set(ids.filter(id => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function saveSeenIds(style, seenIds) {
  const storage = getStorage()
  if (!storage) return

  try {
    const state = JSON.parse(storage.getItem(STORAGE_KEY) || '{}')
    state[style] = [...seenIds]
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable in private browsing or under strict policies.
  }
}
