// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { hasClaimedName, hasSkippedName, markNameSkipped, markNameClaimed } from './username'

describe('username skip flag', () => {
  beforeEach(() => localStorage.clear())

  it('hasSkippedName returns false initially', () => {
    expect(hasSkippedName()).toBe(false)
  })

  it('markNameSkipped sets the flag', () => {
    markNameSkipped()
    expect(hasSkippedName()).toBe(true)
  })

  it('markNameClaimed clears the skip flag as side-effect', () => {
    markNameSkipped()
    expect(hasSkippedName()).toBe(true)
    markNameClaimed('TestUser')
    expect(hasSkippedName()).toBe(false)
    expect(hasClaimedName()).toBe(true)
  })

  it('hasSkippedName returns false when storage unavailable', () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = () => { throw new Error('no storage') }
    expect(hasSkippedName()).toBe(false)
    Storage.prototype.getItem = orig
  })
})
