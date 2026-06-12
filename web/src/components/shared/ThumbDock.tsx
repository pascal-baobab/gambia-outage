// ThumbDock.tsx — the two core actions, always reachable. Ported from shared-ui.jsx.
// "POWER OUT" (report a cut) is the prominent primary action — that's what the app is for. "POWER
// BACK" stays available as the secondary. (Earlier the permanent estimated-blackout baseline inverted
// these so BACK was primary; that made reporting a fresh cut counter-intuitive — people tapped the big
// BACK button by mistake and lit their own outage back up — so the inversion was removed.)
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'

// `stillDark` (optional): the one-tap "Still dark · Ankum si" reconfirm row, shown only when this
// device has an active outage it reported (App resolves it from lastOutReport()). It re-affirms the
// SAME zone in one tap, no sheet — a small cathartic ritual for a place that's perennially dark, and
// it keeps the event fresh. `zoneName` labels which area it confirms.
export function ThumbDock({
  onReport,
  stillDark,
  blocked = false,
}: {
  onReport: (action: 'out' | 'back') => void
  stillDark?: { zoneName: string; onConfirm: () => void } | null
  /** Geo-gate: visitor is outside The Gambia → the buttons are disabled and a note explains why. */
  blocked?: boolean
}) {
  const th = useTheme()
  const t = useT()
  const base = {
    borderRadius: 16,
    border: 'none',
    fontFamily: GPT_FONT,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  } as const
  return (
    <div
      style={{
        // Symmetric 11px top/bottom — the safe-area inset is owned by BottomNav (the LAST element);
        // adding it here too pushed a big empty gap between the dock and the radio strip below it.
        // Owner 2026-06-10: dock slimmed to ~half its former footprint (was 60px buttons + 11px pads).
        padding: '7px 14px',
        background: GPT_T.paper,
        borderTop: `1px solid ${GPT_T.line}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
        boxShadow: '0 -6px 20px rgba(15,23,34,0.05)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, opacity: blocked ? 0.45 : 1 }}>
        {/* 44px = the WCAG 2.5.5 touch-target floor — these are THE primary CTAs, going lower than
            44 would trade real tappability for the space saving. */}
        <button onClick={() => onReport('out')} disabled={blocked} aria-disabled={blocked} style={{ ...base, flex: 1.6, minHeight: 44, background: th.out, color: '#fff', fontSize: 14.5, boxShadow: blocked ? 'none' : `0 5px 14px ${th.out}55`, cursor: blocked ? 'not-allowed' : 'pointer' }}>
          <GPTIcon name="out" size={18} color="#fff" strokeColor={th.out} /> {t.dock.powerOut}
        </button>
        <button onClick={() => onReport('back')} disabled={blocked} aria-disabled={blocked} style={{ ...base, flex: 1, minHeight: 44, background: th.onBg, color: th.onDeep, border: `2px solid ${th.onLine}`, fontSize: 12.5, gap: 6, cursor: blocked ? 'not-allowed' : 'pointer' }}>
          <GPTIcon name="on" size={16} color={th.on} /> {t.dock.powerBack}
        </button>
      </div>
      {/* Geo-gate note: reporting is GM-only; explain why the buttons are inert. */}
      {blocked && (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: GPT_T.ink45, textAlign: 'center', lineHeight: 1.35 }}>
          {t.dock.geoBlocked}
        </div>
      )}
      {!blocked && stillDark && (
        <button
          onClick={stillDark.onConfirm}
          aria-label={t.dock.stillDarkAria(stillDark.zoneName)}
          style={{
            ...base,
            width: '100%',
            minHeight: 40,
            gap: 8,
            background: GPT_T.wash,
            color: GPT_T.ink70,
            border: `1.5px solid ${GPT_T.line}`,
            fontSize: 13.5,
            fontWeight: 800,
          }}
        >
          <GPTIcon name="out" size={16} color={th.out} strokeColor={th.out} />
          {t.dock.stillDark(stillDark.zoneName)}
        </button>
      )}
    </div>
  )
}
