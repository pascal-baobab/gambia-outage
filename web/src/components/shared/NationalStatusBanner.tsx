// NationalStatusBanner.tsx — a SLIM, unmistakable national status line for the top of the News tab
// (replaces the heavy StatHero dashboard there). One reading, no jargon, no micro-chart:
//   1. "11h 08m in the dark today"  ·  "average across the N affected regions"
//   2. ONE day-proportion bar: of a 24h day, how much an affected region spent in the dark (dark fill)
//      vs with power (light track) — instantly legible, unlike a 24-segment sparkline.
//   3. a labelled split underneath ("11h 08m dark" / "12h 52m power") + a muted evidence footer.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { baselineOn } from '@/lib/launch'
import { useStats } from '@/hooks/useData'
import { displayStatus } from '@/lib/status'
import type { National, MacroPin } from '@/lib/types'
import { useT } from '@/i18n/useT'

function hm(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function NationalStatusBanner({ national, macros }: { national: National; macros?: MacroPin[] }) {
  const th = useTheme()
  const t = useT()
  const est = baselineOn()
  const { hours, mins, regionsTotal, reports } = national
  // M4 fix (Home-vs-News mismatch): the server's regionsOut ignores the display-layer estimated
  // baseline, so the Home hero could show 7 estimated-dark regions while this banner said "0 of 7".
  // When macros are provided, count dark the same way every render site does: displayStatus().
  const regionsOut = macros
    ? macros.filter((m) => {
        const ds = displayStatus({ reports: m.reports, status: m.status, sev: m.sev, lastSignal: m.lastSignal, staleClose: m.staleClose }, est)
        return ds === 'out' || ds === 'partial' || ds === 'estimated'
      }).length
    : national.regionsOut
  // Footer shows the CUMULATIVE total of reports ever logged (from /stats), not just today's count —
  // a steadier signal of how much evidence backs the record. Falls back to today's count until loaded.
  const stats = useStats()
  const totalReports = stats.data?.reports ?? reports
  const darkMin = Math.min(24 * 60, hours * 60 + mins)
  // M4 fix: "with power" must only count time the day has actually DELIVERED — `24h − dark` claimed
  // "22h 30m with power" at 11pm on a day with 90 dark minutes when only ~21h had elapsed. Banjul is
  // UTC+0 (no DST), so elapsed-since-midnight is plain UTC arithmetic.
  const now = new Date()
  const elapsedMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  const powerMin = Math.max(0, elapsedMin - darkMin)
  const darkPct = Math.round((darkMin / (24 * 60)) * 100)

  return (
    <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, padding: '14px 16px', fontFamily: GPT_FONT, boxShadow: '0 1px 2px rgba(15,23,34,0.04)' }}>
      {/* headline */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: GPT_T.ink, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>
          {hours}h {String(mins).padStart(2, '0')}m
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: GPT_T.ink70 }}>{t.banner.darkTodayLabel(est)}</span>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 3 }}>
        {t.banner.averageAcross(regionsOut, regionsTotal)}
      </div>

      {/* one day-proportion bar: dark share of a 24h day */}
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginTop: 12, background: GPT_T.line2 }}>
        <div style={{ width: `${darkPct}%`, background: th.out, transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, fontSize: 12, fontWeight: 700 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: GPT_T.ink }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: th.out }} /> {t.banner.darkDuration(hm(darkMin))}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: GPT_T.ink45 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: GPT_T.line2 }} /> {t.banner.powerDuration(hm(powerMin))}
        </span>
      </div>

      {/* evidence footer */}
      <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${GPT_T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>
        <span><b style={{ color: GPT_T.ink70 }}>{t.banner.ofCount(regionsOut, regionsTotal)}</b> {t.banner.regionsDark}</span>
        <span><b style={{ color: GPT_T.ink70 }}>{t.banner.reportsLogged(totalReports)}</b></span>
      </div>
    </div>
  )
}
