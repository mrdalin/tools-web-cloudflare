export interface CategoryPosition {
  id: string
  top: number
}

const TOP_ACTIVATION_OFFSET = 100
const PAGE_BOTTOM_TOLERANCE = 2

export const resolveActiveCategory = (
  categories: CategoryPosition[],
  viewportHeight: number,
  distanceToBottom: number,
) => {
  if (categories.length === 0) return ''

  if (distanceToBottom <= PAGE_BOTTOM_TOLERANCE) {
    return categories[categories.length - 1].id
  }

  const centerActivationOffset = Math.max(TOP_ACTIVATION_OFFSET, viewportHeight / 2)
  const bottomProgress = viewportHeight > 0
    ? Math.min(1, Math.max(0, 1 - distanceToBottom / viewportHeight))
    : 0
  const activationOffset = TOP_ACTIVATION_OFFSET
    + (centerActivationOffset - TOP_ACTIVATION_OFFSET) * bottomProgress
  let activeCategory = ''

  for (const category of categories) {
    if (category.top <= activationOffset) {
      activeCategory = category.id
    } else {
      break
    }
  }

  return activeCategory
}
