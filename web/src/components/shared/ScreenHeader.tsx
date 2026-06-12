// ScreenHeader.tsx — one consistent header for every screen, carrying the always-visible circular
// C∞O logo mark so the Gambia Outage brand is present on every route (elegant but unobtrusive).
// Optional back button (drill-downs) and a trailing slot (Share / WhatsApp / etc.).
import type { ReactNode } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { LogoMark } from '@/components/Logo'
import { IconBtn } from './IconBtn'
import { StatusStripConnected } from './StatusStripConnected'
import { FlagRule } from '@/components/Flag'
import { useT } from '@/i18n/useT'

export function ScreenHeader({
  title,
  onBack,
  trailing,
  status,
  notch = true,
}: {
  title: string
  onBack?: () => void
  trailing?: ReactNode
  /** Show the 7-region status strip beneath the title. Defaults to ON for top-level tabs
   *  (no back arrow) and OFF for drill-down screens (where the national strip is redundant). */
  status?: boolean
  /** Apply the notch/Dynamic-Island top clearance. ON when this is the top-most header; set OFF when
   *  it sits BELOW the global AppHeader (e.g. the Map tab) — otherwise the safe-top padding leaves a
   *  blank band that makes the header look "detached" from the brand bar above it. */
  notch?: boolean
}) {
  const showStatus = status ?? !onBack
  const t = useT()
  return (
    <div style={{ flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          // Notch / Dynamic Island clearance up top ONLY when top-most; otherwise it sits under the
          // AppHeader and the safe-top band would look detached from the brand bar.
          paddingTop: notch ? 'var(--go-safe-top)' : (onBack ? 8 : 10),
          paddingInlineEnd: onBack ? 12 : 16,
          paddingBottom: onBack ? 8 : 10,
          paddingInlineStart: onBack ? 12 : 16,
          background: GPT_T.paper,
          borderBottom: `1px solid ${GPT_T.line}`,
          fontFamily: GPT_FONT,
        }}
      >
        {onBack && <IconBtn icon="back" onClick={onBack} label={t.screenHeader.backAria} />}
        <LogoMark size={24} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 17,
            fontWeight: 800,
            color: GPT_T.ink,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {trailing}
      </div>
      {showStatus && <FlagRule height={3} radius={0} style={{ width: '100%' }} />}
      {showStatus && <StatusStripConnected />}
    </div>
  )
}
