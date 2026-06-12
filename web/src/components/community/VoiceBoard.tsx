// VoiceBoard.tsx — "Civic Voice" (Phase 5, engagement board). A friendly participation ranking:
// distinct neighbours (rl_key) + confirms, kept fair across quarter sizes by the Neighbourhood Watch
// streak (consecutive days with ≥1 report). Proud-but-sober: this celebrates SPEAKING UP, not outages.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'
import type { VoiceRow } from '@/lib/types'

export function VoiceBoard({
  rows,
  yourZoneId,
  onOpenZone,
}: {
  rows: VoiceRow[]
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
        const top = r.rankVoice === 1
        const mine = r.zoneId === yourZoneId
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
              borderLeft: `4px solid ${top ? th.on : mine ? GPT_T.ink25 : GPT_T.line}`,
              fontFamily: GPT_FONT,
            }}
          >
            <span
              style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: top ? th.on : th.onBg, color: top ? '#fff' : th.onDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.rankVoice}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
                {mine && <span style={{ marginInlineStart: 7, fontSize: 10.5, fontWeight: 800, color: GPT_T.ink45 }}>· YOU</span>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{r.region}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              {r.watchDays > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 8, background: th.onBg, color: th.onDeep, fontSize: 11.5, fontWeight: 800 }}>
                  <GPTIcon name="shield" size={12} color={th.onDeep} /> {t.community.watchChip(r.watchDays)}
                </span>
              )}
              <div style={{ textAlign: 'end', minWidth: 54 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: GPT_T.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{r.reporters}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: GPT_T.ink45, marginTop: 1 }}>voices</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
