// RightNowHero.tsx — the Home centrepiece: "The Gambia right now" as 7 per-region BARS, one per
// macro region. Each bar's filled (dark) length is the REAL share of today spent in the dark
// (todayMin / 24h) — never decorative — with the hours and an honest "est." tag beside it; lit
// regions read "on" in amber. Worst (most dark) first. Tap a row → that region.
// Clean LIGHT header (logo + LIVE + profile + WhatsApp + about); the hourly timeline lives in Community.
// Uses displayStatus so the bars match the list/map exactly (open event ⇒ dark even at 0 reports today).
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { LiveDot } from '@/components/LiveDot'
import { GPTIcon } from '@/components/icons'
import { displayStatus, isLit, darkFraction, type DisplayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { fmtHM } from '@/lib/format'
import { REGION_ORDER } from '@/lib/regionOrder'
import type { MacroPin } from '@/lib/types'
import { useT } from '@/i18n/useT'

/** One region's bar row. Renders one of THREE honest states, driven by the row's display status so it
 *  never makes a claim the evidence doesn't support:
 *    • lit  (status 'on')        → amber sliver + "on"
 *    • awaiting (status 'nodata') → empty grey track + "—" / "awaiting" — NO power claim either way
 *      (reports===0 ⇒ never a false ON *and* never a false "0h 00m dark"); matches the AWAITING
 *      treatment used in the list/map/zone.
 *    • dark (out/partial)        → red fill = REAL share of today in the dark (todayMin / 24h). */
function BarRow({ r, onOpenZone }: { r: RegionRow; onOpenZone: (id: string) => void }) {
  const th = useTheme()
  const t = useT()
  const a11y = r.lit ? t.hero.litA11y : r.awaiting ? t.hero.awaitingA11y : t.hero.darkTodayA11y(fmtHM(r.todayMin))
  return (
    <button
      onClick={() => onOpenZone(r.id)}
      aria-label={`${r.label} ${a11y}`}
      style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', cursor: 'pointer', padding: '2px 0', fontFamily: GPT_FONT, textAlign: 'start' }}
    >
      <span style={{ width: 58, flexShrink: 0, fontSize: 12, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{r.label}</span>
      {/* The bar: track = full day, fill = REAL share of the day in the dark (todayMin / 24h).
          Awaiting rows show the bare track (no fill) — an empty/grey "no signal yet", never a red bar. */}
      <span aria-hidden="true" style={{ flex: 1, height: 9, borderRadius: 5, background: GPT_T.line2, overflow: 'hidden', position: 'relative' }}>
        {r.lit ? (
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: th.on, borderRadius: 5 }} />
        ) : r.awaiting ? null : (
          <span style={{ display: 'block', height: '100%', width: `${Math.max(4, r.frac * 100)}%`, background: th.out, borderRadius: 5, transition: 'width .4s' }} />
        )}
      </span>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 78, justifyContent: 'flex-end' }}>
        {r.lit ? (
          <span style={{ fontSize: 11.5, fontWeight: 800, color: th.on, fontVariantNumeric: 'tabular-nums' }}>{t.hero.litShort}</span>
        ) : r.awaiting ? (
          <>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums' }}>—</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: GPT_T.ink45 }}>{t.hero.awaitingShort}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: th.onDeep, fontVariantNumeric: 'tabular-nums' }}>{fmtHM(r.todayMin)}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: GPT_T.ink45 }}>{t.hero.darkShort}</span>
          </>
        )}
      </span>
    </button>
  )
}

/** Summary card that stands in for the estimated (baseline, no-report) regions — so a quiet day doesn't
 *  render as 7 identical "12h 00m … est." rows (which read as a broken app). When EVERY region is
 *  estimated it's the whole story ("all 7 regions"); otherwise it tails the real bars ("N more regions"). */
function EstimatedSummary({ count, all, estMin }: { count: number; all: boolean; estMin: number }) {
  const th = useTheme()
  const t = useT()
  const hours = Math.round(estMin / 60)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 13, background: th.estimatedBg, border: `1px solid ${th.estimatedLine}`, marginTop: all ? 0 : 4 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: GPT_T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GPTIcon name="estimated" size={20} color={th.estimatedDeep} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.2 }}>
          {all ? t.hero.nationwide : t.hero.moreRegionsEst(count)}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink70, marginTop: 1, lineHeight: 1.35 }}>
          {/* "~0h/day estimated" is zero-information noise (and double-qualifies a row whose card
              already says "estimated") — only quote the per-day figure when it's non-zero. */}
          {hours > 0 ? `${t.hero.estPerDay(hours)} · ` : ''}{all ? t.hero.allRegionsCount(count) : t.hero.awaitingFirstReport}
        </div>
      </div>
    </div>
  )
}

interface RegionRow { id: string; label: string; status: DisplayStatus; todayMin: number; lit: boolean; estimated: boolean; awaiting: boolean; frac: number }

function RegionBars({ macros, onOpenZone }: { macros: MacroPin[]; onOpenZone: (id: string) => void }) {
  const baseline = baselineOn()
  const byId = new Map(macros.map((m) => [m.id, m]))
  // Resolve each region's display status + today's darkness, then sort worst (most dark) first.
  const rows: RegionRow[] = REGION_ORDER.map(({ id, label }) => {
    const m = byId.get(id)
    const status = m ? displayStatus({ reports: m.reports, status: m.status, sev: m.sev, lastSignal: m.lastSignal, staleClose: m.staleClose }, baseline) : 'nodata'
    const todayMin = m?.todayMin ?? 0
    return { id, label, status, todayMin, lit: isLit(status), estimated: status === 'estimated', awaiting: status === 'nodata', frac: darkFraction(todayMin) }
  }).sort((a, b) => b.todayMin - a.todayMin)

  // Split: each region gets its own row (dark = proportional bar, lit = "on", nodata = "awaiting");
  // only purely ESTIMATED baseline regions collapse into one summary card instead of identical rows.
  const real = rows.filter((r) => !r.estimated)
  const est = rows.filter((r) => r.estimated)
  const estMin = est[0]?.todayMin ?? 720

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
      {real.map((r) => (
        <BarRow key={r.id} r={r} onOpenZone={onOpenZone} />
      ))}
      {est.length > 0 && <EstimatedSummary count={est.length} all={real.length === 0} estMin={estMin} />}
    </div>
  )
}

export function RightNowHero({
  macros,
  offline = false,
  onOpenZone,
}: {
  macros: MacroPin[]
  offline?: boolean
  onOpenZone: (id: string) => void
}) {
  const th = useTheme()
  const t = useT()
  // Solidarity, from REAL evidence only: distinct neighbours reporting darkness right now = sum of the
  // open events' confirm counts (distinct rl_keys, last 60m) across regions that aren't lit. Turns an
  // isolating outage into a shared one ("you're not alone") without inventing a number. Hidden at 0.
  const darkNeighbours = macros.reduce((s, m) => s + (m.status !== 'on' ? m.confirms || 0 : 0), 0)
  return (
    <div
      style={{
        background: GPT_T.paper,
        borderBottom: `1px solid ${GPT_T.line}`,
        // The global AppHeader (Shell) now owns the notch clearance + brand bar; this sits below it.
        paddingTop: 14,
        paddingInlineStart: 16,
        paddingInlineEnd: 16,
        paddingBottom: 15,
        flexShrink: 0,
        fontFamily: GPT_FONT,
      }}
    >
      {/* Friendly animated disclaimer — a gently flickering bulb + an honest one-liner about the data. */}
      <div
        className="go-disc"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginTop: 0,
          padding: '8px 11px',
          background: th.onBg,
          border: `1px solid ${th.onLine}`,
          borderRadius: 11,
        }}
      >
        <span className="go-bulb-flicker" style={{ lineHeight: 0, filter: `drop-shadow(0 0 5px ${th.on}66)`, flexShrink: 0 }}>
          <GPTIcon name="on" size={16} color={th.on} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink70, lineHeight: 1.35 }}>
          {t.hero.estimatedNote}
        </span>
      </div>

      {/* Section title + live/updated meta (LIVE moved here, out of the crowded brand bar). */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, letterSpacing: -0.4 }}>{t.hero.rightNow}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {offline ? <LiveDot offline /> : <LiveDot />}
          <span style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45 }}>{t.hero.updatedPrefix} {offline ? t.hero.updatedAgo : t.hero.updatedNow}</span>
        </span>
      </div>
      {darkNeighbours > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, fontWeight: 700, color: th.outDeep }}>
          <span aria-hidden="true">🤝</span>
          <span>{t.hero.neighboursDark(darkNeighbours)}</span>
        </div>
      )}
      <RegionBars macros={macros} onOpenZone={onOpenZone} />
    </div>
  )
}
