import assert from 'node:assert/strict'
import test from 'node:test'
import { getLocalToken, getUserFromToken, isTokenExpired } from '../../src/utils/user.ts'

const withStorage = (descriptor, run) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor })
  try {
    run()
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
}

test('reads existing tokens without surrounding whitespace', () => {
  withStorage({ value: { getItem: key => key === 'TOKEN' ? '  saved-token  ' : null } }, () => {
    assert.equal(getLocalToken(), 'saved-token')
  })
})

test('treats missing or blank tokens as logged out', () => {
  for (const value of [null, '', '   ']) {
    withStorage({ value: { getItem: () => value } }, () => {
      assert.equal(getLocalToken(), null)
      assert.equal(getUserFromToken(), null)
    })
  }
})

test('keeps public pages usable when the localStorage getter is blocked', () => {
  withStorage({ get() { throw new DOMException('Storage blocked', 'SecurityError') } }, () => {
    assert.equal(getLocalToken(), null)
    assert.equal(getUserFromToken(), null)
    assert.equal(isTokenExpired(), false)
  })
})

test('keeps public pages usable when reading TOKEN is blocked', () => {
  withStorage({ value: { getItem() { throw new DOMException('Storage blocked', 'SecurityError') } } }, () => {
    assert.equal(getLocalToken(), null)
    assert.equal(getUserFromToken(), null)
  })
})
