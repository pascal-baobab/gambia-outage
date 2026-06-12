// charts.tsx — hand-rolled SVG charts (NO Recharts). Ported 1:1 from shared-ui.jsx.
import { GPT_T } from '@/lib/tokens'
import { useTheme } from '@/app/theme'

/** Tiny trend line for list rows. */
export function Sparkline({ data, color, w = 64, h = 26 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const lastY = pts[pts.length - 1].split(',')[1]
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r="2.6" fill={color} />
    </svg>
  )
}

/** 7-day bar chart for zone detail. Per-bar sev band (out ≥9h, partial ≥5h, else on).
 * `dates` (optional, [oldest..today], e.g. "26/5") renders a small calendar date under each weekday.
 * `todayStatus` (optional) colours the last (today) bar by the LIVE display status instead of the raw
 * hours band — so a "REPORTED"/amber zone never shows a misleading green bar for a still-unfolding day. */
export function BarChart7({ data, days, dates, todayStatus }: { data: number[]; days: string[]; dates?: string[]; todayStatus?: 'out' | 'partial' | 'on' | 'nodata' | 'estimated' }) {
  const th = useTheme()
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 158 }}>
      {data.map((v, i) => {
        const isToday = i === data.length - 1
        const sev: 'out' | 'partial' | 'on' = v >= 9 ? 'out' : v >= 5 ? 'partial' : 'on'
        const barColor = isToday && todayStatus ? th[todayStatus] : th[sev]
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: GPT_T.ink70, fontVariantNumeric: 'tabular-nums' }}>{v}h</span>
            <div
              style={{
                width: '100%',
                height: `${(v / max) * 100}%`,
                minHeight: 4,
                borderRadius: '5px 5px 0 0',
                background: barColor,
                opacity: isToday ? 1 : 0.62,
                outline: isToday ? `2px solid ${GPT_T.ink}` : 'none',
                outlineOffset: 1,
              }}
            />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: isToday ? GPT_T.ink : GPT_T.ink45, lineHeight: 1.1 }}>{days[i]}</span>
            {dates && <span style={{ fontSize: 9.5, fontWeight: 600, color: GPT_T.ink45, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{dates[i]}</span>}
          </div>
        )
      })}
    </div>
  )
}
