// MyAreaCard.tsx — pinned "My area" status card on Home. Ported 1:1 from features.jsx.
import { GPT_T, GPT_FONT, type Status } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { displayStatus } from '@/lib/status'
import { baselineOn } from '@/lib/launch'
import { fmtHM } from '@/lib/format'
import { useT } from '@/i18n/useT'

export interface AreaStatus {
  id: string
  name: string
  region: string
  status: Status
  mins: number
  reports: number
  confirms: number
  lastSignal?: 'out' | 'back' | null
  staleClose?: boolean
  since?: string | null
}

export function MyAreaCard({
  st,
  alertOn,
  onOpen,
  onReport,
  onToggleAlert,
  onClear,
}: {
  st: AreaStatus
  alertOn: boolean
  onOpen: () => void
  onReport: (action: 'out' | 'back') => void
  onToggleAlert: () => void
  onClear: () => void
}) {
  const t = useT()
  const th = useTheme()
  const ds = displayStatus({ reports: st.reports, status: st.status, lastSignal: st.lastSignal, staleClose: st.staleClose }, baselineOn())
  // Quick report defaults to "power out" (the app's core action) — only a CONFIRMED-dark area (real
  // reports: out/partial) flips it to "power back", where reporting restoration is the useful next
  // signal. An estimated/awaiting area is only ASSUMED dark, so its quick action stays "out" (confirm
  // the cut) rather than pushing "back" — otherwise a real cut gets logged as a restoration by mistake.
  const quickAction: 'out' | 'back' = ds === 'out' || ds === 'partial' ? 'back' : 'out'
  const c = th[ds]
  const bg = th[`${ds}Bg`]
  const deep = th[`${ds}Deep`]
  const line = th[`${ds}Line`]
  return (
    <div style={{ margin: '10px 12px 0', borderRadius: 16, border: `1.5px solid ${line}`, background: bg, overflow: 'hidden', fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px' }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GPTIcon name={ds} size={22} color="#fff" strokeColor={c} />
        </span>
        <button onClick={onOpen} style={{ flex: 1, minWidth: 0, textAlign: 'start', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, color: deep, textTransform: 'uppercase' }}>{t.myArea.label}</span>
            <GPTIcon name="pin" size={11} color={deep} />
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: deep }}>{ds === 'estimated' ? t.myArea.estimatedStatus : ds === 'nodata' ? t.myArea.noDataStatus : ds === 'on' ? t.myArea.onStatus : t.myArea.outageDuration(fmtHM(st.mins))}</div>
          {/* "since when" — the product's core question; only when the server actually knows. */}
          {st.since && (ds === 'on' || ds === 'out' || ds === 'partial') && (
            <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{ds === 'on' ? t.zone.backSince(st.since) : t.zone.darkSince(st.since)}</div>
          )}
        </button>
        <button
          onClick={onToggleAlert}
          aria-pressed={alertOn}
          title={t.myArea.alertTitle}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: alertOn ? GPT_T.ink : GPT_T.paper,
            border: `1.5px solid ${alertOn ? GPT_T.ink : line}`,
          }}
        >
          <GPTIcon name={alertOn ? 'bell' : 'bell-off'} size={20} color={alertOn ? '#fff' : GPT_T.ink70} />
        </button>
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${line}` }}>
        <button
          onClick={() => onReport(quickAction)}
          style={{
            flex: 1,
            padding: '9px',
            background: 'transparent',
            border: 'none',
            borderRight: `1px solid ${line}`,
            cursor: 'pointer',
            fontFamily: GPT_FONT,
            fontSize: 13,
            fontWeight: 800,
            color: GPT_T.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <GPTIcon name={quickAction === 'out' ? 'out' : 'on'} size={16} color={quickAction === 'out' ? th.out : th.on} strokeColor={bg} /> {t.myArea.quickReport}
        </button>
        <button onClick={onClear} style={{ padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 700, color: GPT_T.ink45 }}>
          {t.myArea.unpin}
        </button>
      </div>
    </div>
  )
}
