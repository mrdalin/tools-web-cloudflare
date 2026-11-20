// Shared by navigation, static page generation, and legacy URL redirects.
export const CATEGORY_PATHS = {
  2: '/developer-tools',
  3: '/text-tools',
  4: '/education-tools',
  5: '/image-tools',
  8: '/data-tools',
  11: '/fun-tools',
  9: '/random-tools',
  7: '/other-tools',
  12: '/useful-websites',
  13: '/productivity-tools',
}

/** @param {number} id */
export const getCategoryPath = (id) => CATEGORY_PATHS[id] || '/'

/** @param {string} path */
export const getCategoryId = (path) =>
  Number(Object.keys(CATEGORY_PATHS).find((id) => CATEGORY_PATHS[id] === path)) || null

/** @param {unknown} value */
export const getLegacyCategoryPath = (value) => {
  if (typeof value !== 'string' || !/^cate_[1-9]\d*$/.test(value)) return null
  return CATEGORY_PATHS[Number(value.slice(5))] || null
}

/** @param {string} path */
export const isToolDirectoryPath = (path) => path === '/' || getCategoryId(path) !== null
