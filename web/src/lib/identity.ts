// identity.ts — DEVICE-LOCAL profile identity (nickname + avatar + bio). ZERO real PII.
//
// HARD INVARIANT (this module): it performs NO network call. nickname/avatarId/bio are read from
// and written to localStorage only. The persistent-pseudonym model PUBLISHES these to the server
// (profiles/posts/comments) but ONLY via an explicit user action through lib/api (saveIntro /
// createPost / createComment) — never from here. Reports stay fully anonymous: the pseudonym is
// NEVER attached to a report. The server still only ever sees the account_id capability + XP unless
// the user chooses to publish social content.

import { AVATARS } from './avatars.generated'

const NICK_KEY = 'go_nickname'
const AVATAR_KEY = 'go_avatar'
const BIO_KEY = 'go_bio'
const HOME_ZONE_KEY = 'go_home_zone' // JSON { id, name, region } — self-declared home neighbourhood

export interface HomeZone { id: string; name: string; region: string }

export interface Identity {
  nickname: string | null
  avatarId: string
  bio: string
}

/**
 * Deterministic default avatar from the account id. AVATARS is itself weighted (~75/15/10), so a
 * uniform pick over the set reproduces the demographic mix.
 */
export function pickDefaultAvatar(accountId: string): string {
  let h = 0
  for (let i = 0; i < accountId.length; i++) h = (h * 31 + accountId.charCodeAt(i)) >>> 0
  return AVATARS[h % AVATARS.length].id
}

export function getIdentity(accountId: string): Identity {
  let nickname: string | null = null
  let avatarId = pickDefaultAvatar(accountId)
  let bio = ''
  try {
    const n = localStorage.getItem(NICK_KEY)
    if (n) nickname = n
    const a = localStorage.getItem(AVATAR_KEY)
    if (a && AVATARS.some((x) => x.id === a)) avatarId = a
    bio = localStorage.getItem(BIO_KEY) || ''
  } catch {
    /* localStorage unavailable */
  }
  return { nickname, avatarId, bio }
}

export function setBio(bio: string | null): void {
  try {
    const v = (bio ?? '').trim().slice(0, 160)
    if (v) localStorage.setItem(BIO_KEY, v)
    else localStorage.removeItem(BIO_KEY)
  } catch {
    /* */
  }
  notify()
}

/** The self-declared home neighbourhood (a chosen quarter), device-local. NOT report-derived. */
export function getHomeZone(): HomeZone | null {
  try {
    const v = localStorage.getItem(HOME_ZONE_KEY)
    return v ? (JSON.parse(v) as HomeZone) : null
  } catch {
    return null
  }
}
export function setHomeZone(z: HomeZone | null): void {
  try {
    if (z && z.id) localStorage.setItem(HOME_ZONE_KEY, JSON.stringify({ id: z.id, name: z.name, region: z.region }))
    else localStorage.removeItem(HOME_ZONE_KEY)
  } catch {
    /* */
  }
  notify()
}

export function setNickname(nickname: string | null): void {
  try {
    const v = (nickname ?? '').trim().slice(0, 24)
    if (v) localStorage.setItem(NICK_KEY, v)
    else localStorage.removeItem(NICK_KEY)
  } catch {
    /* */
  }
  notify()
}

export function setAvatar(avatarId: string): void {
  try {
    if (AVATARS.some((x) => x.id === avatarId)) localStorage.setItem(AVATAR_KEY, avatarId)
  } catch {
    /* */
  }
  notify()
}

type Listener = () => void
const listeners = new Set<Listener>()
export function onIdentityChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function notify() {
  listeners.forEach((l) => {
    try {
      l()
    } catch {
      /* */
    }
  })
}
