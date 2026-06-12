// status.ts — severity → status classification. Ported 1:1 from ds.jsx `sevToStatus`.
// The CLIENT only classifies for rendering; the SERVER owns sev/status derivation (§4.5).
import type { Status } from './tokens'
import { SINGLE_REPORT_TRUTH } from './flags'

/** sev ≥ 0.66 → 'out' · ≥ 0.38 → 'partial' · else 'on'. Identical to design/ds.jsx. */
export function sevToStatus(sev: number): Status {
  return sev >= 0.66 ? 'out' : sev >= 0.38 ? 'partial' : 'on'
}

/** Display-only superset of `Status`: 'nodata' (no evidence) + 'estimated' (launch blackout baseline). */
export type DisplayStatus = Status | 'nodata' | 'estimated'

/**
 * Evidence gate: a zone with reports trusts the server status; a zone with ZERO reports makes NO
 * confirmed claim. With `baseline` ON (launch nationwide-blackout window) a zero-report quarter
 * renders 'estimated' (clearly-labelled DARK estimate from NAWEC load-shedding — never confirmed);
 * otherwise it renders 'nodata' ("Awaiting reports"). Either way the trust pipeline is untouched —
 * a single real report flips the quarter to its real on/partial/out status.
 */
export function displayStatus(
  z: { reports: number; status?: Status; sev?: number; lastSignal?: 'out' | 'back' | null; staleClose?: boolean },
  baseline = false,
): DisplayStatus {
  // SINGLE_REPORT_TRUTH phase: an OPEN event is hard evidence — the LATEST signal wins, and it wins
  // EVEN when today's report counter is 0. A blackout opened earlier (e.g. last night) with no "power
  // back" reported yet is STILL dark, so it must read DARK ('out'), never grey "AWAITING". A fresh
  // BACK re-lights it (LIGHT = 'on') while the event closes out. `lastSignal` is only present while an
  // event is open — the backend auto-closes idle/stale events (AUTOCLOSE_IDLE_HOURS / MAX_EVENT_HOURS),
  // after which it falls through to the evidence gate below. This MUST precede the zero-report gate,
  // otherwise a still-open outage with no new report today falsely shows "AWAITING" (the whole point
  // of one-report-true: a single OUT means there is darkness there).
  if (SINGLE_REPORT_TRUTH && z.lastSignal) {
    return z.lastSignal === 'back' ? 'on' : 'out'
  }
  // Stale auto-close gate (2026-06-12): the backend's idle/max-hours timeout closed today's outage
  // WITHOUT any restore evidence (no community-confirmed close, no post-close 'back' report). The
  // server still derives 'on' (no open event), but a lit bulb here is a lie — the zone went silent,
  // not bright. Render the honest grey "Awaiting reports" until someone actually signals.
  if (z.staleClose) return 'nodata'
  // Evidence gate: no open event AND zero reports → make NO power claim (never a false POWER ON). With
  // `baseline` ON (launch nationwide-blackout window) a zero-report zone renders 'estimated'.
  if (!z.reports) return baseline ? 'estimated' : 'nodata'
  return z.status ?? sevToStatus(z.sev ?? 0)
}

/**
 * Binary lit/dark for the simplified at-a-glance UI (status strip + region bars). Only 'on' reads as
 * LIT; every dark/under-confirmed/estimated/no-data state collapses to DARK so a phone user sees one
 * of two things — a lit bulb or an unlit one — with no ambiguous half-transparent middle states.
 * The honest 'estimated' qualifier is carried separately (a small "est." tag), never by going grey.
 */
export function isLit(s: DisplayStatus): boolean {
  return s === 'on'
}

/** Minutes-of-darkness today → fraction of a 24h day (0..1), clamped. Drives the REAL proportional
 *  fill of the region bars — the bar length always equals the share of the day spent in the dark. */
export function darkFraction(todayMin: number): number {
  const MINUTES_PER_DAY = 24 * 60
  if (!Number.isFinite(todayMin) || todayMin <= 0) return 0
  return Math.min(1, todayMin / MINUTES_PER_DAY)
}

export type { Status }
