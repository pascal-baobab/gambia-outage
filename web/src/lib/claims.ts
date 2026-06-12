// claims.ts — pending XP claims. After a report is accepted (online or offline-replayed), its
// claim_nonce is queued here and redeemed against /api/go/xp/claim. Decoupled from the report: the
// queue holds only nonces, never report content. Idempotent — the server drops an already-claimed or
// never-minted nonce (4xx) and we remove it; network failures stay queued for the next flush.
import { getAccountId } from './account'
import { claimXp } from './api'
import type { Profile } from './xp'

const KEY = 'go_xp_claims'

function read(): string[] {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as string[]) : [] } catch { return [] }
}
function write(list: string[]): void {
  // slice(-100): deliberate cap — unlike the report outbox, XP claims beyond 100 queued-while-offline
  // are dropped (oldest evicted). Acceptable tradeoff: offline XP is minor; unbounded growth is not.
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-100))) } catch { /* full/unavailable */ }
}

export function enqueueClaim(nonce: string): void {
  if (!nonce) return
  const list = read()
  if (!list.includes(nonce)) { list.push(nonce); write(list) }
}

let flushing = false
let lastProfile: Profile | null = null
export function lastClaimedProfile(): Profile | null { return lastProfile }

/** Try to redeem every queued nonce. Returns the latest profile (or null if nothing redeemed).
 *  Network failure → stop and keep the rest queued. Server 4xx → drop the nonce (already done). */
export async function flushClaims(): Promise<Profile | null> {
  if (flushing) return lastProfile
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return lastProfile
  flushing = true
  try {
    const account = await getAccountId()
    let list = read()
    for (const nonce of [...list]) {
      try {
        lastProfile = await claimXp(account, nonce)
        list = list.filter((n) => n !== nonce); write(list)
      } catch (err) {
        if (err && (err as Error).name === 'NetworkError') break // retry later
        list = list.filter((n) => n !== nonce); write(list) // deterministic reject → drop it
      }
    }
  } finally {
    flushing = false
  }
  return lastProfile
}
