import { describe, it, expect } from 'vitest'
import { detectPlatform, shouldShowInstall, type InstallEligibility } from './pwa'

const UA = {
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  iosFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  desktopFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
}

describe('detectPlatform — UA → install affordance', () => {
  it('iOS Safari is installable (A2HS steps)', () => {
    expect(detectPlatform(UA.iosSafari)).toBe('ios-safari')
  })
  it('iOS Chrome/Firefox cannot install (open-in-Safari hint)', () => {
    expect(detectPlatform(UA.iosChrome)).toBe('ios-other')
    expect(detectPlatform(UA.iosFirefox)).toBe('ios-other')
  })
  it('Android Chromium → native prompt path', () => {
    expect(detectPlatform(UA.androidChrome)).toBe('android')
  })
  it('desktop / unknown → other (no auto sheet)', () => {
    expect(detectPlatform(UA.desktopFirefox)).toBe('other')
    expect(detectPlatform('')).toBe('other')
  })
})

describe('shouldShowInstall — eligibility (§6.5)', () => {
  const base: InstallEligibility = {
    installed: false,
    platform: 'android',
    reportCount: 0,
    screensSeen: 0,
    dismissedAt: null,
  }

  it('never shows when already installed', () => {
    expect(shouldShowInstall({ ...base, installed: true, reportCount: 5 })).toBe(false)
  })
  it('never shows on a non-actionable platform', () => {
    expect(shouldShowInstall({ ...base, platform: 'other', screensSeen: 5 })).toBe(false)
  })
  it('not shown before engagement (no report, <2 screens)', () => {
    expect(shouldShowInstall({ ...base, screensSeen: 1 })).toBe(false)
  })
  it('shows once engaged by a report', () => {
    expect(shouldShowInstall({ ...base, reportCount: 1 })).toBe(true)
  })
  it('shows once engaged by ≥2 screens', () => {
    expect(shouldShowInstall({ ...base, screensSeen: 2 })).toBe(true)
  })
  it('iOS platforms are actionable', () => {
    expect(shouldShowInstall({ ...base, platform: 'ios-safari', screensSeen: 2 })).toBe(true)
    expect(shouldShowInstall({ ...base, platform: 'ios-other', screensSeen: 2 })).toBe(true)
  })
  it('after dismissal, stays hidden until +3 reports', () => {
    // dismissed at reportCount=2 → needs reportCount ≥ 5
    expect(shouldShowInstall({ ...base, reportCount: 2, dismissedAt: 2 })).toBe(false)
    expect(shouldShowInstall({ ...base, reportCount: 4, dismissedAt: 2 })).toBe(false)
    expect(shouldShowInstall({ ...base, reportCount: 5, dismissedAt: 2 })).toBe(true)
  })
  it('dismissed at 0 reports (engaged by screens) re-shows after 3 reports', () => {
    expect(shouldShowInstall({ ...base, screensSeen: 3, reportCount: 0, dismissedAt: 0 })).toBe(false)
    expect(shouldShowInstall({ ...base, screensSeen: 3, reportCount: 3, dismissedAt: 0 })).toBe(true)
  })
})
