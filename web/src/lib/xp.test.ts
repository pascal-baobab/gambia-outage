import { describe, it, expect } from 'vitest'
import { rankFor, RANKS, BADGE_LABEL } from './xp'

describe('xp', () => {
  it('maps xp to the right rank', () => {
    expect(rankFor(0).key).toBe('observer')
    expect(rankFor(9).key).toBe('observer')
    expect(rankFor(10).key).toBe('watcher')
    expect(rankFor(29).key).toBe('watcher')
    expect(rankFor(30).key).toBe('sentinel')
    expect(rankFor(50).key).toBe('guardian')
    expect(rankFor(9999).key).toBe('guardian')
  })
  it('thresholds are ascending and start at 0', () => {
    expect(RANKS[0].min).toBe(0)
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min)
  })
  it('labels every known badge', () => {
    expect(BADGE_LABEL.first_witness).toBeTruthy()
    expect(BADGE_LABEL.light_spotter).toBeTruthy()
    expect(BADGE_LABEL.always_watching).toBeTruthy()
  })
})
