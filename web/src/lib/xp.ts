// xp.ts — client mirror of the server rank ladder + badge labels (pb_hooks/lib/go.js RANKS/rankFor).
// Keep thresholds in sync with the server; the server is authoritative for awarded XP.
export interface Rank { key: string; label: string; min: number }

export const RANKS: Rank[] = [
  { key: 'observer', label: 'Observer', min: 0 },
  { key: 'watcher', label: 'Watcher', min: 10 },
  { key: 'sentinel', label: 'Sentinel', min: 30 },
  { key: 'guardian', label: 'Guardian of the Quarter', min: 50 },
]

export function rankFor(xp: number): Rank {
  let cur = RANKS[0]
  for (const r of RANKS) if (xp >= r.min) cur = r
  return cur
}

export const BADGE_LABEL: Record<string, string> = {
  first_witness: 'First Witness',
  light_spotter: 'Light Spotter',
  always_watching: 'Always Watching',
  first_ambassador: 'First Ambassador',
}

export interface Profile {
  xp: number
  rank: string
  rankLabel: string
  nextRank: string | null
  toNext: number
  badges: string[]
  streakWeeks: number
  week_id: string
}
