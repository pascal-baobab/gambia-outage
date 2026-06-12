import { describe, it, expect } from 'vitest'
import { isoWeekId } from './week'

describe('isoWeekId (Banjul = UTC)', () => {
  it('matches the live backend week for launch Monday', () => {
    // 1 June 2026 (Monday) → 2026-W23 (verified against /api/go/community weekId)
    expect(isoWeekId(new Date('2026-06-01T00:00:00Z'))).toBe('2026-W23')
    expect(isoWeekId(new Date('2026-06-07T23:59:00Z'))).toBe('2026-W23') // Sunday, same ISO week
  })

  it('places the illustrative seed week at 2026-W22', () => {
    expect(isoWeekId(new Date('2026-05-25T00:00:00Z'))).toBe('2026-W22') // Monday
    expect(isoWeekId(new Date('2026-05-31T12:00:00Z'))).toBe('2026-W22') // Sunday
  })

  it('rolls over at the Monday boundary', () => {
    expect(isoWeekId(new Date('2026-06-08T00:00:00Z'))).toBe('2026-W24')
  })

  it('handles the year boundary by ISO rules (Jan 1 2026 is in W01)', () => {
    expect(isoWeekId(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01')
  })
})
