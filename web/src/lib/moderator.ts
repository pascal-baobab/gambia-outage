// moderator.ts — in-app moderation by the is_moderator capability (e.g. ATPC / VALDA). A pseudonym the
// owner has flagged can HARD-delete ANY content via /api/go/mod/delete — authorised server-side by its
// OWN account_id (the device capability), so no PocketBase superuser token and no Cloudflare Access are
// needed. Distinct from lib/admin.ts (superuser soft-hide): moderation here is irreversible + cascades.
import { useEffect, useState } from 'react'
import { getAccountId } from './account'
import { fetchIntro } from './api'
import type { ModType } from './admin'

// The device's own moderator flag, resolved once and shared (avoids a fetch per content card).
let cached: boolean | null = null
let inflight: Promise<boolean> | null = null

function loadIsModerator(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached)
  if (!inflight) {
    inflight = getAccountId()
      .then((id) => fetchIntro(id))
      .then((p) => { cached = !!p.isModerator; return cached })
      .catch(() => { cached = false; return false })
  }
  return inflight
}

/** HARD-delete a piece of content as a moderator. The server verifies is_moderator from account_id. */
export async function modDeleteContent(type: ModType, id: string, accountId: string): Promise<void> {
  const r = await fetch('/api/go/mod/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ account_id: accountId, type, id }),
  })
  if (!r.ok) {
    let message = `Delete failed (${r.status})`
    try { const b = (await r.json()) as { message?: string }; if (b?.message) message = b.message } catch { /* */ }
    throw new Error(message)
  }
}

/** True when THIS device's account holds the moderator capability. Fetches the profile once, caches. */
export function useIsModerator(): boolean {
  const [mod, setMod] = useState<boolean>(cached ?? false)
  useEffect(() => {
    let alive = true
    loadIsModerator().then((v) => { if (alive) setMod(v) })
    return () => { alive = false }
  }, [])
  return mod
}
