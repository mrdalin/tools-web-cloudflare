import { toolsList } from '../components/Tools/tools.ts'
import type { ToolsInfo } from '../components/Tools/tools.type.ts'

export const FREQUENT_TOOLS_STORAGE_KEY = 'youngbar:frequent-tools:v1'
export const FREQUENT_TOOLS_UPDATED_EVENT = 'youngbar:frequent-tools-updated'
export const FREQUENT_TOOLS_LIMIT = 8

const DEFAULT_RECOMMENDATION_PATHS = [
  '/json', '/timetran', '/qrcode', '/randompassword',
  '/unit', '/colorpicker', '/base64', '/md5',
]

export interface FrequentToolRecord {
  path: string
  useCount: number
  lastUsed: number
}

interface FrequentToolsState {
  version: 1
  records: FrequentToolRecord[]
  hiddenPaths: string[]
  order: string[]
}

export interface FrequentToolItem {
  tool: ToolsInfo
  useCount: number
  lastUsed: number
  isRecommended: boolean
}

const emptyState = (): FrequentToolsState => ({ version: 1, records: [], hiddenPaths: [], order: [] })

export const normalizeToolPath = (path: string) => {
  const rawPath = String(path || '').split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : '/' + rawPath
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '')
}

let toolIndex: Map<string, ToolsInfo> | undefined
const getToolIndex = () => {
  toolIndex ??= new Map((toolsList() as ToolsInfo[]).map(tool => [normalizeToolPath(tool.url), tool]))
  return toolIndex
}

// 仅归并已定义的工具详情路由，未知地址不作为使用记录。
const DETAIL_ROUTES: [RegExp, string][] = [
  [/^\/backend-docs\/[^/]+$/, '/backend-docs'],
  [/^\/flashcards\/deck\/[^/]+(?:\/study)?$/, '/flashcards'],
  [/^\/travel-map\/(?:plaza|share\/[^/]+)$/, '/travel-map'],
  [/^\/music-playlist\/(?:song|playlist)\/[^/]+$/, '/music-playlist'],
]

const resolveToolPath = (path: string) => {
  const normalized = normalizeToolPath(path)
  if (getToolIndex().has(normalized)) return normalized
  return DETAIL_ROUTES.find(([pattern]) => pattern.test(normalized))?.[1]
}

// 存储受限时仍允许在当前页面管理；刷新后由浏览器决定是否能保留。
let volatileState: FrequentToolsState | undefined
const copyState = (state: FrequentToolsState): FrequentToolsState => ({
  version: 1,
  records: state.records.map(record => ({ ...record })),
  hiddenPaths: [...state.hiddenPaths],
  order: [...state.order],
})

const readState = (): FrequentToolsState => {
  if (volatileState) return copyState(volatileState)
  if (typeof window === 'undefined') return emptyState()

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FREQUENT_TOOLS_STORAGE_KEY) || 'null')
    if (!parsed || parsed.version !== 1) return emptyState()

    const index = getToolIndex()
    const records = new Map<string, FrequentToolRecord>()
    for (const item of Array.isArray(parsed.records) ? parsed.records : []) {
      if (!item || typeof item.path !== 'string' || !Number.isFinite(item.useCount)
        || item.useCount < 1 || !Number.isFinite(item.lastUsed) || item.lastUsed < 0) continue
      const path = normalizeToolPath(item.path)
      if (!index.has(path)) continue
      const existing = records.get(path)
      records.set(path, {
        path,
        useCount: Math.max(existing?.useCount || 0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(item.useCount))),
        lastUsed: Math.max(existing?.lastUsed || 0, item.lastUsed),
      })
    }
    const cleanPaths = (paths: unknown): string[] => Array.isArray(paths)
      ? [...new Set(paths.filter((path): path is string => typeof path === 'string')
        .map(normalizeToolPath).filter(path => index.has(path)))]
      : []

    return { version: 1, records: [...records.values()], hiddenPaths: cleanPaths(parsed.hiddenPaths), order: cleanPaths(parsed.order) }
  } catch {
    return emptyState()
  }
}

const writeState = (state: FrequentToolsState) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FREQUENT_TOOLS_STORAGE_KEY, JSON.stringify(state))
    volatileState = undefined
  } catch {
    volatileState = copyState(state)
  }
  window.dispatchEvent(new CustomEvent(FREQUENT_TOOLS_UPDATED_EVENT))
}

export const isFrequentToolsPersistent = () => !volatileState

const sortByUsage = (a: FrequentToolRecord, b: FrequentToolRecord) =>
  b.useCount - a.useCount || b.lastUsed - a.lastUsed || a.path.localeCompare(b.path)

export const getFrequentTools = (limit = FREQUENT_TOOLS_LIMIT): FrequentToolItem[] => {
  if (!Number.isFinite(limit) || limit <= 0) return []
  const state = readState()
  const hidden = new Set(state.hiddenPaths)
  const records = new Map(state.records.map(record => [record.path, record]))
  const index = getToolIndex()
  const recommendations = [
    ...state.order.filter(path => DEFAULT_RECOMMENDATION_PATHS.includes(path)),
    ...DEFAULT_RECOMMENDATION_PATHS,
  ]
  const candidates = [...new Set([
    ...state.records.slice().sort(sortByUsage).map(record => record.path),
    ...recommendations,
  ])].filter(path => !hidden.has(path) && index.has(path)).slice(0, Math.min(FREQUENT_TOOLS_LIMIT, Math.floor(limit)))

  // 先按使用记录选出常用项，再应用手动顺序，保证新工具仍有机会进入常用区。
  const visible = new Set(candidates)
  return [...new Set([...state.order.filter(path => visible.has(path)), ...candidates])].map(path => ({
    tool: index.get(path)!,
    useCount: records.get(path)?.useCount || 0,
    lastUsed: records.get(path)?.lastUsed || 0,
    isRecommended: !records.has(path),
  }))
}

export const recordToolVisit = (path: string, fromPath?: string) => {
  const canonicalPath = resolveToolPath(path)
  if (!canonicalPath || (fromPath !== undefined && resolveToolPath(fromPath) === canonicalPath)) return
  const state = readState()
  const existing = state.records.find(record => record.path === canonicalPath)
  if (existing) {
    existing.useCount = Math.min(Number.MAX_SAFE_INTEGER, existing.useCount + 1)
    existing.lastUsed = Date.now()
  } else {
    state.records.push({ path: canonicalPath, useCount: 1, lastUsed: Date.now() })
  }
  writeState(state)
}

export const removeFrequentTool = (path: string) => {
  const normalized = normalizeToolPath(path)
  if (!getToolIndex().has(normalized)) return
  const state = readState()
  if (!state.hiddenPaths.includes(normalized)) state.hiddenPaths.push(normalized)
  state.order = state.order.filter(item => item !== normalized)
  writeState(state)
}

export const reorderFrequentTools = (fromPath: string, toPath: string) => {
  const from = normalizeToolPath(fromPath)
  const to = normalizeToolPath(toPath)
  if (from === to) return
  const visiblePaths = getFrequentTools().map(item => normalizeToolPath(item.tool.url))
  const fromIndex = visiblePaths.indexOf(from)
  const toIndex = visiblePaths.indexOf(to)
  if (fromIndex < 0 || toIndex < 0) return
  visiblePaths.splice(fromIndex, 1)
  visiblePaths.splice(toIndex, 0, from)
  const state = readState()
  state.order = visiblePaths
  writeState(state)
}

export const restoreFrequentTools = () => {
  const state = readState()
  state.hiddenPaths = []
  state.order = []
  writeState(state)
}
