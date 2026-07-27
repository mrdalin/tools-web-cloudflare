import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveActiveCategory } from '../../src/components/Home/scrollSpy.ts'

const trailingCategories = [
  { id: 'cate_10', top: -138 },
  { id: 'cate_12', top: 403 },
  { id: 'cate_13', top: 631 },
]

test('selects the section near the viewport center when approaching the page bottom', () => {
  assert.equal(resolveActiveCategory(trailingCategories, 1017, 150), 'cate_12')
})

test('does not skip a compact section when the bottom threshold starts moving', () => {
  const categories = [
    { id: 'cate_11', top: -607 },
    { id: 'cate_9', top: 91 },
    { id: 'cate_7', top: 319 },
  ]

  assert.equal(resolveActiveCategory(categories, 1017, 992), 'cate_9')
})

test('selects the final section at the page bottom', () => {
  const categoriesAtBottom = [
    { id: 'cate_10', top: -288 },
    { id: 'cate_12', top: 253 },
    { id: 'cate_13', top: 481 },
  ]

  assert.equal(resolveActiveCategory(categoriesAtBottom, 1017, 0), 'cate_13')
})

test('keeps the existing top threshold away from the page bottom', () => {
  const categories = [
    { id: 'cate_1', top: -20 },
    { id: 'cate_2', top: 300 },
  ]

  assert.equal(resolveActiveCategory(categories, 1017, 1200), 'cate_1')
})
