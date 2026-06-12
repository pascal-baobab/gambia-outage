// quickReport.ts — ONE-TAP report, no sheet. Powers the "Still dark · Ankum si" reconfirm button:
// a user who already reported their area can re-affirm it's STILL out with a single tap (cathartic,
// and it refreshes the event's freshness for the decay window). It is the SAME anonymous create as
// ReportSheet.submit(), minus the form UI — mint a per-report claim_nonce, POST, record the device's
// local "my report", and redeem the XP capability. Cache invalidation is the caller's job (hook).
//
// Trust note (invariant #2): one device re-tapping does NOT add a distinct rl_key, so it cannot hold a
// zone "dark" by itself — confirmation is still community-based. This button is engagement + freshness,
// never a Sybil lever. The backend rate-window (≤1 OUT / rl_key / zone / RL_OUT_WINDOW_MIN) returns a
// "already counted" rejection, which we surface as a gentle success, not an error.
import { createReport, ReportError, NetworkError, type ReportInput } from './api'
import { claimNonce } from './account'
import { enqueueClaim, flushClaims } from './claims'
import { addMyReport } from './myReports'
import { enqueue } from './outbox'
import type { Profile } from './xp'

export interface QuickZone {
  id: string
  name: string
  region: string
  regionId?: string
}

export type QuickResult =
  | { status: 'ok'; profile: Profile | null }
  | { status: 'offline' }
  | { status: 'counted' } // rate-window: already counted recently → soft success
  | { status: 'error'; message: string }

const regionOf = (zone: QuickZone) => zone.regionId || (zone.id.includes('-') ? zone.id.split('-')[0] : zone.id)

export async function quickReport(action: 'out' | 'back', zone: QuickZone): Promise<QuickResult> {
  const nonce = claimNonce()
  const input: ReportInput = {
    type: action,
    source: 'manual',
    zone: zone.id,
    client_uuid: crypto.randomUUID(),
    claim_nonce: nonce,
  }
  const regionId = regionOf(zone)
  const recordLocal = () => addMyReport({ zoneId: zone.id, name: zone.name, region: zone.region, type: action, at: Date.now() })

  try {
    await createReport(input, null)
    recordLocal()
    if (action === 'out') {
      try {
        localStorage.setItem('go_my_report', JSON.stringify({ zoneId: zone.id, regionId, at: Date.now() }))
        window.dispatchEvent(new Event('go-my-report'))
      } catch { /* storage unavailable */ }
    }
    enqueueClaim(nonce)
    let profile: Profile | null = null
    try { profile = await flushClaims() } catch { /* XP best-effort */ }
    return { status: 'ok', profile }
  } catch (err) {
    if (err instanceof NetworkError) {
      try {
        await enqueue({ client_uuid: input.client_uuid!, input, queuedAt: Date.now(), place: `${zone.name}, ${zone.region}` })
        recordLocal()
        enqueueClaim(nonce)
        return { status: 'offline' }
      } catch { /* IndexedDB unavailable → fall through */ }
    }
    if (err instanceof ReportError) {
      const m = err.message.toLowerCase()
      if (m.includes('duplicate out') || m.includes('rate window')) return { status: 'counted' }
      return { status: 'error', message: err.friendly }
    }
    return { status: 'error', message: 'Could not send. Please try again.' }
  }
}
