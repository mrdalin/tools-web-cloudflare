export interface HomeScrollPosition {
  left: number
  top: number
}

interface HomeVisit {
  fullPath: string
  position: HomeScrollPosition
}

const HOME_VISIT_KEY = 'youngbar:home-visit'
let lastHomeVisit: HomeVisit | null = null
let homeReady = Promise.resolve()
let resolveHomeReady = () => {}

export const isHomeScrollPosition = (value: unknown): value is HomeScrollPosition => {
  if (!value || typeof value !== 'object') return false
  const position = value as HomeScrollPosition
  return Number.isFinite(position.left) && position.left >= 0
    && Number.isFinite(position.top) && position.top >= 0
}

export const rememberHomeVisit = (fullPath: string, position: HomeScrollPosition) => {
  lastHomeVisit = { fullPath, position }
  try {
    sessionStorage.setItem(HOME_VISIT_KEY, JSON.stringify(lastHomeVisit))
  } catch {
    // 禁用浏览器存储时，仍可在当前页面会话中恢复位置。
  }
}

export const getLastHomeVisit = (): HomeVisit | null => {
  if (lastHomeVisit) return lastHomeVisit
  try {
    const visit = JSON.parse(sessionStorage.getItem(HOME_VISIT_KEY) || 'null')
    if (visit && typeof visit.fullPath === 'string'
      && /^\/(?:[?#]|$)/.test(visit.fullPath) && isHomeScrollPosition(visit.position)) {
      lastHomeVisit = visit
    }
  } catch {
    // 旧数据损坏或存储不可用时，使用正常的首页入口。
  }
  return lastHomeVisit
}

// 路由切换有淡出动画，必须等首页卡片渲染完成后才能恢复较深的位置。
export const prepareHomeScroll = () => {
  resolveHomeReady()
  homeReady = new Promise<void>((resolve) => {
    resolveHomeReady = resolve
  })
}

export const waitForHomeReady = () => homeReady
export const markHomeReady = () => resolveHomeReady()
