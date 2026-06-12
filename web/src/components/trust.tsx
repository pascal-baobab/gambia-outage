// trust.tsx — trust layer UI: ConfidenceChip, TrustLine, AreaActions.
// Ported 1:1 from design/features.jsx. confirmed = confirms >= CONFIRM_THRESHOLD (8).
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { CONFIRM_THRESHOLD } from '@/lib/constants'
import { useT } from '@/i18n/useT'

/** Confirmed (≥ threshold distinct reports) vs Unconfirmed. */
export function ConfidenceChip({ confirms = 0, size = 'md' }: { confirms?: number; size?: 'sm' | 'md' }) {
  const t = useT()
  const th = useTheme()
  const ok = confirms >= CONFIRM_THRESHOLD
  const c = ok ? th.on : th.partial
  const deep = ok ? th.onDeep : th.partialDeep
  const bg = ok ? th.onBg : th.partialBg
  const line = ok ? th.onLine : th.partialLine
  const sm = size === 'sm'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sm ? 4 : 6,
        padding: sm ? '3px 8px' : '5px 10px',
        borderRadius: 999,
        background: bg,
        border: `1.5px solid ${line}`,
        color: deep,
        fontFamily: GPT_FONT,
        fontWeight: 800,
        fontSize: sm ? 11 : 12.5,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <GPTIcon name={ok ? 'shield' : 'info'} size={sm ? 13 : 15} color={c} /> {ok ? t.trust.confirmed : t.trust.unconfirmed}
    </span>
  )
}

/** Visual confidence toward "confirmed": CONFIRM_THRESHOLD pips, one per distinct neighbour report in
 * the last hour. Fills amber while under-confirmed and tips to red the moment it hits the threshold —
 * so even a single report visibly signals a PROBABLE outage building toward a confirmed one. */
export function ConfidenceMeter({ confirms = 0 }: { confirms?: number }) {
  const t = useT()
  const th = useTheme()
  const ok = confirms >= CONFIRM_THRESHOLD
  const filled = Math.min(confirms, CONFIRM_THRESHOLD)
  const fill = ok ? th.out : th.partial
  return (
    <div style={{ fontFamily: GPT_FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45 }}>
          {t.trust.meterLabel}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, color: ok ? th.onDeep : th.partialDeep, fontVariantNumeric: 'tabular-nums' }}>
          {filled} / {CONFIRM_THRESHOLD}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: CONFIRM_THRESHOLD }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: i < confirms ? fill : GPT_T.line }} />
        ))}
      </div>
    </div>
  )
}

/** One-line trust explainer used on zone detail. */
export function TrustLine({ confirms = 0 }: { confirms?: number }) {
  const t = useT()
  const th = useTheme()
  const ok = confirms >= CONFIRM_THRESHOLD
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: GPT_FONT, fontSize: 12.5, color: GPT_T.ink70, fontWeight: 600, lineHeight: 1.4 }}>
      <span style={{ marginTop: 1 }}>
        <GPTIcon name={ok ? 'shield' : 'info'} size={15} color={ok ? th.on : th.partial} />
      </span>
      {ok ? (
        <span>{t.trust.confirmedExplanation(confirms)}</span>
      ) : (
        <span>{t.trust.unconfirmedExplanation(Math.max(1, CONFIRM_THRESHOLD - confirms), confirms === 0 ? t.trust.reportsLabel : t.trust.confirmationsLabel)}</span>
      )}
    </div>
  )
}

/** Zone detail: set-as-my-area + alert toggle. */
export function AreaActions({
  isMine,
  alertOn,
  onSetMine,
  onToggleAlert,
}: {
  isMine: boolean
  alertOn: boolean
  onSetMine: () => void
  onToggleAlert: () => void
}) {
  const t = useT()
  const th = useTheme()
  const pill = (active: boolean, activeBg: string) =>
    ({
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      cursor: 'pointer',
      fontFamily: GPT_FONT,
      fontWeight: 800,
      fontSize: 13.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      background: active ? activeBg : GPT_T.paper,
      color: active ? '#fff' : GPT_T.ink70,
      border: `1.5px solid ${active ? activeBg : GPT_T.line}`,
    }) as const
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <button onClick={onSetMine} style={pill(isMine, GPT_T.ink)}>
        <GPTIcon name={isMine ? 'check' : 'pin'} size={17} color={isMine ? '#fff' : GPT_T.ink70} /> {isMine ? t.trust.setMyAreaActive : t.trust.setMyArea}
      </button>
      <button onClick={onToggleAlert} style={pill(alertOn, th.out)}>
        <GPTIcon name={alertOn ? 'bell' : 'bell-off'} size={17} color={alertOn ? '#fff' : GPT_T.ink70} /> {alertOn ? t.trust.alertsOn : t.trust.notifyMe}
      </button>
    </div>
  )
}
