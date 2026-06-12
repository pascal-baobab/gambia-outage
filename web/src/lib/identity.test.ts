// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  getIdentity,
  setNickname,
  setAvatar,
  setBio,
  pickDefaultAvatar,
  onIdentityChange,
} from './identity'
import { AVATARS } from './avatars.generated'

beforeEach(() => localStorage.clear())

const ACC = 'a'.repeat(64)

describe('identity', () => {
  it('picks a stable, valid default avatar from the account id', () => {
    const a = pickDefaultAvatar(ACC)
    const b = pickDefaultAvatar(ACC)
    expect(a).toBe(b) // deterministic
    expect(AVATARS.some((x) => x.id === a)).toBe(true) // valid id
    // getIdentity falls back to the default when nothing stored
    expect(getIdentity(ACC).avatarId).toBe(a)
    expect(getIdentity(ACC).nickname).toBeNull()
  })

  it('round-trips a nickname, trimming + capping at 24 chars', () => {
    setNickname('  Fatou  ')
    expect(getIdentity(ACC).nickname).toBe('Fatou')
    setNickname('x'.repeat(40))
    expect(getIdentity(ACC).nickname).toBe('x'.repeat(24))
  })

  it('clears the nickname on empty / whitespace / null', () => {
    setNickname('Lamin')
    expect(getIdentity(ACC).nickname).toBe('Lamin')
    setNickname('   ')
    expect(getIdentity(ACC).nickname).toBeNull()
    setNickname('Lamin')
    setNickname(null)
    expect(getIdentity(ACC).nickname).toBeNull()
  })

  it('setAvatar stores a known id and ignores an unknown one', () => {
    const valid = AVATARS[3].id
    setAvatar(valid)
    expect(getIdentity(ACC).avatarId).toBe(valid)
    setAvatar('not-a-real-avatar')
    expect(getIdentity(ACC).avatarId).toBe(valid) // unchanged
  })

  it('notifies subscribers on change and unsubscribes', () => {
    let n = 0
    const off = onIdentityChange(() => n++)
    setNickname('A')
    setAvatar(AVATARS[0].id)
    expect(n).toBe(2)
    off()
    setNickname('B')
    expect(n).toBe(2) // no further calls after unsubscribe
  })

  it('default avatars are weighted African (>=0.6 of synthetic ids map to african group)', () => {
    const hex = '0123456789abcdef'
    let african = 0
    const N = 1000
    for (let i = 0; i < N; i++) {
      let id = ''
      // deterministic-but-varied synthetic 64-hex id per i
      let s = i * 2654435761
      for (let j = 0; j < 64; j++) {
        s = (s * 1103515245 + 12345) >>> 0
        id += hex[s & 15]
      }
      const picked = pickDefaultAvatar(id)
      const group = AVATARS.find((x) => x.id === picked)!.group
      if (group === 'african') african++
    }
    expect(african / N).toBeGreaterThanOrEqual(0.6)
  })

  it('round-trips a bio, trimming + capping at 160 chars, clearing on empty', () => {
    expect(getIdentity(ACC).bio).toBe('')
    setBio('  Teacher in Serrekunda  ')
    expect(getIdentity(ACC).bio).toBe('Teacher in Serrekunda')
    setBio('y'.repeat(200))
    expect(getIdentity(ACC).bio).toBe('y'.repeat(160))
    setBio('   ')
    expect(getIdentity(ACC).bio).toBe('')
  })

  it('contains NO network calls in the source', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(resolve(here, 'identity.ts'), 'utf8')
    expect(/\bfetch\b/.test(src)).toBe(false)
    expect(/XMLHttpRequest|navigator\.sendBeacon|EventSource|WebSocket/.test(src)).toBe(false)
  })

  it('all 16 legacy avatar IDs still resolve after regeneration to 40 total (AVAT-02)', () => {
    const LEGACY_IDS = [
      'african-w-1', 'african-w-2', 'african-w-3', 'african-w-4', 'african-w-5', 'african-w-6',
      'african-m-1', 'african-m-2', 'african-m-3', 'african-m-4', 'african-m-5', 'african-m-6',
      'indian-w-1', 'indian-m-1', 'caucasian-w-1', 'caucasian-m-1',
    ]
    // Assert total count first
    expect(AVATARS.length).toBe(40)
    // Assert each legacy ID is still in the set and resolves via setAvatar
    for (const id of LEGACY_IDS) {
      expect(AVATARS.some((x) => x.id === id)).toBe(true) // ID still in set
      setAvatar(id)
      expect(getIdentity(ACC).avatarId).toBe(id) // resolves, not silently dropped
    }
  })
})
