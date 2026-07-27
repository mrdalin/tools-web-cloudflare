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

  const activationOffset = distanceToBottom < viewportHeight
    ? Math.max(TOP_ACTIVATION_OFFSET, viewportHeight / 2)
    : TOP_ACTIVATION_OFFSET
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
