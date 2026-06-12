// launch.ts — estimated-baseline config.
// The Gambia is under sustained NAWEC load-shedding (~12h/day). A zone with NO open event AND zero
// fresh reports renders as 'estimated dark' at the daily-average baseline — a clearly-labelled
// ESTIMATE (never a confirmed claim, never "Verified by N"). This is a DISPLAY layer only — it never
// fabricates events/reports, so the trust
// pipeline stays 100% real. The MOMENT a neighbour reports, that zone's real status (on/partial/out)
// overrides the estimate — reports are the gold. The server read-model carries the matching 12h
// figures (see lib/go.js CFG.BASELINE_*), so national/region/history numbers stay consistent.

/** Launch moment — Monday 1 June 2026, 18:00 Africa/Banjul (= UTC+0). */
export const LAUNCH_AT = Date.parse('2026-06-01T18:00:00Z')

/** Master switch (set false to retire the estimated baseline without a logic redeploy). */
export const BASELINE_ENABLED = true

/** Estimated daily average in the dark (minutes) — 12h. Mirrors server CFG.BASELINE_DAILY_MIN. */
export const BASELINE_DAILY_MIN = 720

/** Is the estimated baseline active? Now permanent (flag-gated) — the load-shedding is ongoing. */
export function baselineOn(_now: number = Date.now()): boolean {
  return BASELINE_ENABLED
}

/** The prominent launch DISCLAIMER banner ran only for the first days, then retired — the discreet
 * "est." tags on figures are the honesty contract now. Kept as a switch in case it's wanted again. */
export function launchBannerOn(_now: number = Date.now()): boolean {
  return false
}
