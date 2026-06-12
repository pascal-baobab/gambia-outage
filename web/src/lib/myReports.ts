// myReports.ts — DEVICE-LOCAL "my reports" tracker. ZERO-PII / anonymous, localStorage only.
// Records the zones THIS device reported (out/back) so the user can revisit/resolve them from
// anywhere. NEVER sent to the server — no network call exists in this module.

const KEY = 'go_my_reports'

export interface MyReport {
  zoneId: string
  name: string
  region: string
  type: 'out' | 'back'
  at: number
}

export function listMyReports(): MyReport[] {
  try {
    const r = localStorage.getItem(KEY)
    return r ? (JSON.parse(r) as MyReport[]) : []
  } catch {
    return []
  }
}

function write(list: MyReport[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-50)))
  } catch {
    /* */
  }
}

/** Upsert: newest entry for a zone wins (dedup by zoneId); keeps most-recent 50, newest last. */
export function addMyReport(entry: MyReport): void {
  const list = listMyReports().filter((e) => e.zoneId !== entry.zoneId)
  list.push(entry)
  write(list)
}

export function removeMyReport(zoneId: string): void {
  write(listMyReports().filter((e) => e.zoneId !== zoneId))
}

/** The device's most-recent OUT report within `maxAgeMs` (default ~14h ≈ "still out today"), or null.
 *  Drives the one-tap "Still dark · Ankum si" reconfirm button — we only offer it when the user has an
 *  active outage they reported. Returns null if their latest signal for that zone was a 'back'. */
export function lastOutReport(maxAgeMs = 14 * 60 * 60 * 1000): MyReport | null {
  const now = Date.now()
  const list = listMyReports() // newest last → scan from the end for the first fresh OUT entry
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i]
    if (e.type === 'out' && now - e.at <= maxAgeMs) return e
  }
  return null
}
