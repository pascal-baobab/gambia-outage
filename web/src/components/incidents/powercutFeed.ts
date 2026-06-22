// powercutFeed.ts — derive the "power cut" feed entries shown among the incidents.
// Source (owner decision 2026-06-22): the quarters that are DARK right now — snapshot.quarters
// (active open events) whose displayStatus reads dark. These are read-only signals lifted from the
// public snapshot (zone-level, no reporter linkage), surfaced in the Incidents feed/map alongside
// civic incidents. They are reported via the OUT/BACK flow, never the incident form.
import type { Snapshot, QuarterPin } from '@/lib/types'
import { displayStatus } from '@/lib/status'

export type PowercutEntry = {
  id: string
  name: string
  /** Display-shaped "dark since" moment from the snapshot ("HH:MM" today / "DD Mon · HH:MM"). */
  since: string | null
  lat: number
  lng: number
}

/** Build the dark-now power-cut entries from a snapshot. `baseline` mirrors the launch estimated
 *  baseline so a zero-report open quarter still reads dark (matches the map + RightNowHero). */
export function buildPowercutEntries(snapshot: Snapshot | undefined, baseline: boolean): PowercutEntry[] {
  const quarters: QuarterPin[] = snapshot?.quarters ?? []
  return quarters
    .filter((q) => {
      const ds = displayStatus({ reports: q.reports, status: q.status, sev: q.sev, lastSignal: q.lastSignal, staleClose: q.staleClose }, baseline)
      return ds === 'out' || ds === 'partial' || ds === 'estimated'
    })
    .map((q) => ({ id: q.id, name: q.name, since: q.since ?? null, lat: q.lat, lng: q.lng }))
}
