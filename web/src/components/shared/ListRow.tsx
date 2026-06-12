// ListRow.tsx — macro list row with status pill + duration (+ optional sparkline).
// Ported from shared-ui.jsx; sparkline is optional since the snapshot omits `week`.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { displayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { fmtHM } from '@/lib/format'
import { StatusPill } from '@/components/StatusPill'
import { GPTIcon } from '@/components/icons'
import { Sparkline } from './charts'

export interface ListRowZone {
  id: string
  name: string
  region: string
  sev: number
  todayMin: number
  reports: number
  week?: number[]
}

export function ListRow({ zone, onClick, rank }: { zone: ListRowZone; onClick: () => void; rank: number }) {
  const th = useTheme()
  const status = displayStatus(zone, baselineOn())
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'start',
        background: GPT_T.paper,
        border: 'none',
        borderBottom: `1px solid ${GPT_T.line2}`,
        padding: '16px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        cursor: 'pointer',
        minHeight: 70,
        fontFamily: GPT_FONT,
      }}
    >
      <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {String(rank).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2 }}>{zone.name}</div>
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2 }}>
          {/* Count is a strength signal — only show it when there ARE reports. A DARK row carried over
              from an earlier blackout (0 reports today) shows just the area + the DARK pill + duration,
              never the contradictory "0 reports" next to a lit-off bulb. The region is skipped when it
              just repeats the zone name (e.g. Kanifing/Kanifing, Banjul/Banjul). */}
          {[zone.region !== zone.name ? zone.region : null, zone.reports > 0 ? `${zone.reports} ${zone.reports === 1 ? 'report' : 'reports'}` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <div style={{ textAlign: 'end', flexShrink: 0 }}>
        <div style={{ marginBottom: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <StatusPill status={status} size="sm" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          {zone.week && zone.week.length > 1 && <Sparkline data={zone.week} color={th[status]} />}
          {/* nodata, or an estimated row with nothing accrued yet (early hours), makes no duration
              claim ('—'); when an estimated figure IS shown, the EST. pill above already qualifies
              it — no second "est." tag on the same row. */}
          {status === 'nodata' || (status === 'estimated' && zone.todayMin === 0) ? (
            <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink25, fontVariantNumeric: 'tabular-nums' }}>—</span>
          ) : (
            <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums' }}>
              {fmtHM(zone.todayMin)}
            </span>
          )}
        </div>
      </div>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
    </button>
  )
}
