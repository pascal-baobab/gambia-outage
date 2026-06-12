// LiveDot.tsx — LIVE / OFFLINE indicator, ported 1:1 from ds.jsx.
// M4: labels default to the active dictionary (FR "EN DIRECT", AR "مباشر") instead of literal English.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import { GPTIcon } from './icons'

export function LiveDot({
  color,
  label,
  dark = false,
  sub,
  offline = false,
}: {
  color?: string
  label?: string
  dark?: boolean
  sub?: string
  offline?: boolean
}) {
  const th = useTheme()
  const t = useT()
  // LIVE = healthy realtime connection → GREEN (the red read as alarming, not "online").
  const c = offline ? GPT_T.ink45 : color || th.on
  if (offline) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: GPT_FONT }}>
        <GPTIcon name="cloud-off" size={15} color={dark ? GPT_T.panelInk60 : GPT_T.ink45} />
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: dark ? GPT_T.panelInk60 : GPT_T.ink45 }}>{t.live.offline}</span>
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: GPT_FONT }}>
      <span style={{ position: 'relative', width: 9, height: 9, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: c, animation: 'gptPulse 2s ease-out infinite' }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: c }} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: dark ? '#fff' : GPT_T.ink }}>{label ?? t.live.live}</span>
      {sub && <span style={{ fontSize: 11.5, fontWeight: 600, color: dark ? GPT_T.panelInk60 : GPT_T.ink45 }}>{sub}</span>}
    </span>
  )
}
