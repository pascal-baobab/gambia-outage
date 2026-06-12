// contrib.ts — device-local "your contributions this week" counter (Phase 5). No PII, no account,
// never leaves the device. Pride is quarter-level only (rl_key rotates daily, so we cannot — and will
// not — track a person over time); this is a private, on-device tally that resets every ISO week, used
// to gently acknowledge a returning reporter. localStorage key `go_my_contrib`.
import { isoWeekId } from './week'

const KEY = 'go_my_contrib'

export interface Contrib {
  weekId: string
  count: number
}

/** Read the counter, auto-resetting to 0 when the ISO week has rolled over. */
export function getContribution(now: Date = new Date()): Contrib {
  const weekId = isoWeekId(now)
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<Contrib>
      if (v && v.weekId === weekId && typeof v.count === 'number') return { weekId, count: v.count }
    }
  } catch {
    /* storage unavailable */
  }
  return { weekId, count: 0 }
}

/** Increment on a successful report (online or offline-queued). Returns the new value. */
export function recordContribution(now: Date = new Date()): Contrib {
  const cur = getContribution(now)
  const next: Contrib = { weekId: cur.weekId, count: cur.count + 1 }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
  return next
}
