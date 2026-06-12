// StatusStrip.tsx — a slim status header carried UNDER the page header on every primary tab (Map,
// Community, News, Profile). The country at a glance: the 7 macro regions West→East, each a single
// binary bulb — LIT (amber + glow = power on) or DARK (solid slate = power out) — with just the region
// initials beneath. NO per-region hours here: seven repeated "12h00m" read as a broken app, so the
// strip stays a pure on/off glance; the actual hours live in the Home bars and the zone detail.
// Tap a region → open that zone. Home keeps its own rich header + region bars.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { displayStatus, isLit } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { REGION_ORDER } from '@/lib/regionOrder'
import type { MacroPin } from '@/lib/types'
import { useT } from '@/i18n/useT'

function StripBulb({ lit }: { lit: boolean }) {
  const th = useTheme()
  // Same filled bulb glyph in both states — only the colour (and the lit glow) changes, so the
  // amber/slate reading is instant and unmistakable on a phone.
  return lit ? (
    <span style={{ filter: `drop-shadow(0 0 7px ${th.on}99)`, lineHeight: 0 }}>
      <GPTIcon name="on" size={20} color={th.on} />
    </span>
  ) : (
    <span style={{ lineHeight: 0 }}>
      <GPTIcon name="on" size={20} color={th.out} />
    </span>
  )
}

export function StatusStrip({ macros, onOpenZone }: { macros: MacroPin[]; onOpenZone: (id: string) => void }) {
  const th = useTheme()
  const t = useT()
  const baseline = baselineOn()
  const byId = new Map(macros.map((m) => [m.id, m]))
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${REGION_ORDER.length}, 1fr)`,
        gap: 2,
        padding: '7px 8px 8px',
        background: GPT_T.paper,
        borderBottom: `1px solid ${GPT_T.line}`,
        flexShrink: 0,
        fontFamily: GPT_FONT,
      }}
    >
      {REGION_ORDER.map(({ id, abbr }) => {
        const m = byId.get(id)
        const status = m ? displayStatus({ reports: m.reports, status: m.status, sev: m.sev, lastSignal: m.lastSignal, staleClose: m.staleClose }, baseline) : 'nodata'
        const lit = isLit(status)
        const n24 = m?.reports24h ?? 0 // reports logged for this region in the last 24h
        // Accessible name = "{region} {state}, N reports in 24h"; glyphs are aria-hidden (WCAG 2.5.3).
        return (
          <button
            key={id}
            onClick={() => onOpenZone(id)}
            aria-label={`${abbr} ${lit ? t.strip.powerOnAria : t.strip.powerOutAria}, ${t.strip.reports24hAria(n24)}`}
            // minHeight 44 = WCAG 2.5.5 touch target; the grid cell gives the width, visuals unchanged.
            style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '1px 0', minHeight: 44, fontFamily: GPT_FONT }}
          >
            <StripBulb lit={lit} />
            <span style={{ fontSize: 9, fontWeight: 800, color: lit ? GPT_T.ink70 : GPT_T.ink45, letterSpacing: 0.2, lineHeight: 1 }}>{abbr}</span>
            {/* Last-24h report count — a real per-region number (counts read fine repeated, unlike hours). */}
            <span aria-hidden="true" title={t.strip.reports24hTitle(n24)} style={{ fontSize: 9.5, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: n24 > 0 ? th.out : GPT_T.ink25 }}>{n24}</span>
          </button>
        )
      })}
    </div>
  )
}
