// profileStore.ts — in-memory single-source-of-truth for the current claimed Profile, with a tiny
// pub/sub so React (useProfile) and any non-React code can stay in sync. No persistence here: the
// authoritative XP/rank/badges come from the server (lib/claims.ts → flushClaims); this just holds
// the latest snapshot for the session. No PII.
import type { Profile } from './xp'

let current: Profile | null = null
type Listener = (p: Profile | null) => void
const listeners = new Set<Listener>()

export function getProfile(): Profile | null {
  return current
}
export function setProfile(p: Profile | null): void {
  current = p
  listeners.forEach((l) => {
    try {
      l(p)
    } catch {
      /* */
    }
  })
}
export function subscribeProfile(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
