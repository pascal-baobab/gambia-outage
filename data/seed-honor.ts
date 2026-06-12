// seed-honor.ts — idempotent ILLUSTRATIVE history for the Wall of Honor (Phase 5).
// Writes 54 weekly_honors rows for HONOR_SEED_WEEK (default 2026-W22 = 25–31 May 2026), one per
// settlement, with deterministic 8–9 h/day dark-minutes (hash of the slug → stable re-runs, no
// Math.random). illustrative=true, source='seed'. Touches ONLY weekly_honors — never events /
// reports / zone_daily_stats (the live trust pipeline stays 100% real). Run: `pnpm -C data seed:honor`.
import { config } from 'dotenv'
import PocketBase from 'pocketbase'
config({ path: new URL('../.env', import.meta.url).pathname })
import { SEED } from './seed-data'

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const EMAIL = process.env.PB_ADMIN_EMAIL || ''
const PASSWORD = process.env.PB_ADMIN_PASSWORD || ''
const WEEK = process.env.HONOR_SEED_WEEK || '2026-W22'

// FNV-1a → deterministic per-slug pseudo-randomness (stable across runs).
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
// 8–9 h/day over 7 days → 7 × (480..540) ≈ 3360..3780 min, deterministic per slug.
function darkMinutesForSlug(slug: string): number {
  let total = 0
  for (let d = 0; d < 7; d++) total += 480 + (hash(`${slug}:${d}`) % 61) // 480..540 min/day
  return total
}

interface Row {
  id: string
  region: string
  dark: number
  reporters: number
  confirms: number
  watchDays: number
  rankDark?: number
  rankVoice?: number
}

async function main() {
  const pb = new PocketBase(PB_URL)
  pb.autoCancellation(false)
  if (!EMAIL || !PASSWORD) throw new Error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (see .env.example).')
  await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD)

  const quarters = SEED.filter((z) => z.level === 'settlement')
  const rows: Row[] = quarters.map((q) => ({
    id: q.id,
    region: q.display_region ?? '',
    dark: darkMinutesForSlug(q.id),
    reporters: 12 + (hash(`${q.id}:rep`) % 60), // 12..71 plausible
    confirms: 8 + (hash(`${q.id}:con`) % 25), // 8..32
    watchDays: 5 + (hash(`${q.id}:wd`) % 3), // 5..7
  }))
  ;[...rows].sort((a, b) => b.dark - a.dark).forEach((r, i) => { r.rankDark = i + 1 })
  ;[...rows].sort((a, b) => b.reporters - a.reporters).forEach((r, i) => { r.rankVoice = i + 1 })

  let created = 0
  let updated = 0
  for (const r of rows) {
    const body = {
      week_id: WEEK,
      zone: r.id,
      region: r.region,
      dark_minutes: r.dark,
      distinct_reporters: r.reporters,
      confirms: r.confirms,
      watch_days: r.watchDays,
      rank_dark: r.rankDark ?? 0,
      rank_voice: r.rankVoice ?? 0,
      illustrative: true,
      source: 'seed',
    }
    try {
      const existing = await pb.collection('weekly_honors').getFirstListItem(`week_id="${WEEK}" && zone="${r.id}"`)
      await pb.collection('weekly_honors').update(existing.id, body)
      updated++
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) {
        await pb.collection('weekly_honors').create(body)
        created++
      } else {
        throw err
      }
    }
  }

  const total = await pb.collection('weekly_honors').getList(1, 1, { filter: `week_id="${WEEK}"` })
  console.log(`✓ seed-honor complete — created ${created}, updated ${updated}, week ${WEEK} rows=${total.totalItems}`)
  if (total.totalItems !== 54) {
    throw new Error(`Seed-honor count mismatch — expected 54 illustrative rows for ${WEEK}, got ${total.totalItems}.`)
  }
}

main().catch((e) => {
  console.error('✗ seed-honor failed:', e?.message || e)
  process.exit(1)
})
