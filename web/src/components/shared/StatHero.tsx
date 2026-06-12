// StatHero.tsx — national stat hero (near-black panel). Ported 1:1 from shared-ui.jsx.
import type { ReactNode } from 'react'
import { GPT_T } from '@/lib/tokens'
import type { National } from '@/lib/types'
import { useTheme } from '@/app/theme'
import { baselineOn } from '@/lib/launch'
import { FlagBg } from '@/components/Flag'
import { Logo } from '@/components/Logo'
import { LiveDot } from '@/components/LiveDot'
import { GPTIcon } from '@/components/icons'
import { IconBtn } from './IconBtn'
import { OutageTimeline } from './OutageTimeline'
import { WhatsAppButton } from './WhatsAppButton'

function Stat({ n, l, t }: { n: ReactNode; l: string; t: number }) {
  return (
    <div>
      <div style={{ fontSize: 22 * t, fontWeight: 800, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11 * t, color: GPT_T.panelInk60, fontWeight: 600, marginTop: 3 }}>{l}</div>
    </div>
  )
}

export function StatHero({
  data,
  offline = false,
  onAbout,
  profileSlot,
  t = 1,
}: {
  data: { national: National }
  offline?: boolean
  onAbout?: () => void
  profileSlot?: ReactNode
  t?: number
}) {
  const th = useTheme()
  // During the launch blackout window the confirmed-report average structurally understates the
  // lived reality (it resets at midnight + averages across regions). Flag it as a floor so the
  // figure doesn't read as "only 5h" against real all-day cuts. No fabricated number — honest qualifier.
  const estimated = baselineOn()
  return (
    <div style={{ background: GPT_T.panel, color: '#fff', padding: '9px 16px 11px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      <FlagBg opacity={0.18} scrim="linear-gradient(180deg, rgba(15,23,34,0.62), rgba(15,23,34,0.86))" />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Logo size={15} mono variant="compact" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {offline ? <LiveDot dark offline /> : <LiveDot dark />}
            {profileSlot}
            <WhatsAppButton variant="icon" size={22} />
            <IconBtn icon="info" onClick={onAbout} color={GPT_T.panelInk60} size={32} label="About & methodology" />
          </div>
        </div>
        <div style={{ fontSize: 10.5 * t, fontWeight: 800, letterSpacing: 1.2, color: GPT_T.panelInk60, textTransform: 'uppercase' }}>
          Power across The Gambia today · by hour
        </div>
        <OutageTimeline national={data.national} th={th} estimated={estimated} t={t} />
        {estimated && (
          <div style={{ fontSize: 10.5 * t, fontWeight: 600, color: GPT_T.panelInk60, marginTop: 4, lineHeight: 1.3 }}>
            Confirmed reports only — real cuts run longer during the blackout.
          </div>
        )}
        {/* One honest report count (no duplicate "Verified by N" + "N reports today"): real, anonymous
            neighbour reports — the evidence behind the figures above. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5 * t, fontWeight: 700, color: GPT_T.panelInk60 }}>
          <GPTIcon name="shield" size={13} color={th.on} /> {data.national.reports.toLocaleString()} {data.national.reports === 1 ? 'person' : 'people'} reported today
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${GPT_T.panelLine}` }}>
          <Stat
            n={
              <span>
                <span style={{ color: th.out }}>{data.national.regionsOut}</span>
                <span style={{ color: GPT_T.panelInk60, fontSize: 14 * t, fontWeight: 600 }}>/{data.national.regionsTotal}</span>
              </span>
            }
            l="regions in the dark"
            t={t}
          />
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 * t, color: GPT_T.panelInk60, fontWeight: 600 }}>
            <GPTIcon name="clock" size={13} color={GPT_T.panelInk60} /> updated {offline ? '4m ago' : 'just now'}
          </div>
        </div>
      </div>
    </div>
  )
}
