// HoursBoard.tsx — "Hours in the Dark" (Phase 5, primary/accountability board). Per-quarter hours of
// CONFIRMED outage this week, ranked worst-first. Framing is sober: the top is the most WRONGED, not a
// winner — no medals, no celebratory colour. Illustrative (seed) rows carry the historical-estimate tag.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { fmtDark } from '@/lib/dur'
import { useT } from '@/i18n/useT'
import type { HoursRow } from '@/lib/types'

export function HoursBoard({
  rows,
  yourZoneId,
  onOpenZone,
}: {
  rows: HoursRow[]
  yourZoneId?: string
  onOpenZone?: (regionId: string) => void
}) {
  const t = useT()
  const th = useTheme()
  if (rows.length === 0) {
    return <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13.5, color: GPT_T.ink45, fontWeight: 600 }}>{t.community.emptyBoard}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => {
        const worst = r.rankDark === 1
        const mine = r.zoneId === yourZoneId
        const tone = r.illustrative ? th.estimated : th.out
        const toneBg = r.illustrative ? th.estimatedBg : th.outBg
        const regionId = r.zoneId.includes('-') ? r.zoneId.split('-')[0] : r.zoneId
        return (
          <button
            key={r.zoneId}
            onClick={() => onOpenZone?.(regionId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'start',
              width: '100%',
              padding: '11px 13px',
              borderRadius: 13,
              cursor: onOpenZone ? 'pointer' : 'default',
              background: mine ? GPT_T.wash : GPT_T.paper,
              border: `1px solid ${mine ? GPT_T.ink25 : GPT_T.line}`,
              borderLeft: `4px solid ${worst ? tone : mine ? GPT_T.ink25 : GPT_T.line}`,
              fontFamily: GPT_FONT,
            }}
          >
            <span
              style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: worst ? tone : toneBg, color: worst ? '#fff' : tone,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.rankDark}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
                {mine && <span style={{ marginInlineStart: 7, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45 }}>· YOU</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                {r.region}
                {worst && <span style={{ color: tone, fontWeight: 800 }}>· worst hit</span>}
              </div>
            </div>
            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{fmtDark(r.darkMinutes)}</div>
              {r.illustrative && <div style={{ fontSize: 9.5, fontWeight: 700, color: GPT_T.ink45, marginTop: 1 }}>est.</div>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
