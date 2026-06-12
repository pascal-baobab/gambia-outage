import { describe, it, expect, beforeEach } from 'vitest'
import { getProfile, setProfile, subscribeProfile } from './profileStore'
import type { Profile } from './xp'

const mk = (xp: number): Profile => ({
  xp,
  rank: 'watcher',
  rankLabel: 'Watcher',
  nextRank: 'sentinel',
  toNext: 30 - xp,
  badges: [],
  streakWeeks: 0,
  week_id: '2026-W23',
})

beforeEach(() => setProfile(null))

describe('profileStore', () => {
  it('getProfile returns the latest set value', () => {
    expect(getProfile()).toBeNull()
    const p = mk(12)
    setProfile(p)
    expect(getProfile()).toBe(p)
  })

  it('notifies subscribers with the new value', () => {
    const seen: (Profile | null)[] = []
    subscribeProfile((p) => seen.push(p))
    setProfile(mk(10))
    setProfile(null)
    expect(seen).toHaveLength(2)
    expect(seen[0]?.xp).toBe(10)
    expect(seen[1]).toBeNull()
  })

  it('unsubscribe stops further notifications', () => {
    let n = 0
    const off = subscribeProfile(() => n++)
    setProfile(mk(5))
    off()
    setProfile(mk(50))
    expect(n).toBe(1)
  })
})
