import { describe, it, expect } from 'vitest'
import { fmtHM, localizeNum } from './format'

describe('fmtHM — must match design/shared-ui.jsx exactly', () => {
  it('zero-pads minutes to 2 digits', () => {
    expect(fmtHM(425)).toBe('7h 05m') // 425 = 7h 5m
  })
  it('handles whole hours', () => {
    expect(fmtHM(120)).toBe('2h 00m')
  })
  it('handles zero', () => {
    expect(fmtHM(0)).toBe('0h 00m')
  })
  it('rounds fractional minutes', () => {
    expect(fmtHM(90.4)).toBe('1h 30m')
    expect(fmtHM(90.6)).toBe('1h 31m')
  })
  it('matches the prototype national example (11h 20m = 680m)', () => {
    expect(fmtHM(680)).toBe('11h 20m')
  })
  it('matches a large duration', () => {
    expect(fmtHM(692)).toBe('11h 32m')
  })
})

describe('localizeNum — display-layer only, internal state always ASCII', () => {
  it('converts digits to Arabic-Indic in ar locale', () => {
    expect(localizeNum('123', 'ar')).toBe('١٢٣')
  })
  it('converts decimal number', () => {
    expect(localizeNum('3.14', 'ar')).toBe('٣.١٤')
  })
  it('leaves non-digit chars untouched', () => {
    expect(localizeNum('Error', 'ar')).toBe('Error')
  })
  it('is a no-op for en locale', () => {
    expect(localizeNum('3.14', 'en')).toBe('3.14')
  })
  it('is a no-op for fr locale', () => {
    expect(localizeNum('0', 'fr')).toBe('0')
  })
})
