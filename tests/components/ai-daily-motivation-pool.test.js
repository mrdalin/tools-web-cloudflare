import assert from 'node:assert/strict'
import test from 'node:test'

import { getNextSeenIds, selectUnseenMotivations } from '../../src/components/Tools/AiDailyMotivation/motivationPool.js'

const motivations = [
  { id: 'one', content: '第一条', style: '励志', createdAt: 1 },
  { id: 'two', content: '第二条', style: '励志', createdAt: 2 },
  { id: 'three', content: '第三条', style: '励志', createdAt: 3 }
]

test('selects only motivations that have not appeared in the current cycle', () => {
  const selected = selectUnseenMotivations(motivations, new Set(['one']), 2, () => 0)

  assert.deepEqual(selected.map(item => item.id).sort(), ['three', 'two'])
})

test('starts the next cycle from the content displayed after a generation', () => {
  const nextSeen = getNextSeenIds({
    previousSeenIds: new Set(['one', 'two', 'three']),
    displayedIds: ['three', 'new-one', 'new-two'],
    generatedIds: ['new-one', 'new-two']
  })

  assert.deepEqual([...nextSeen].sort(), ['new-one', 'new-two', 'three'])
})
