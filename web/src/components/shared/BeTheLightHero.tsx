// BeTheLightHero.tsx — the Home centerpiece for this phase. Motivational, community-first: a lit
// bulb + "Be the light" headline CENTERED on a WARM LIGHT card (amber `onBg`, not a dark panel), with
// a small factual subline ("{regionsOut}/{regionsTotal} regions dark now · {contributors} reporting
// today"). Replaces the red/green 24-bar timeline as the hero (the timeline is demoted to Community).
// Light + centered so it sits cohesively among the page's other white cards. Pure presentation.
import type { ReactNode } from 'react'
import { GPT_T } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import type { National } from '@/lib/types'
import { useT } from '@/i18n/useT'

export function BeTheLightHero({
  data,
  contributors = 0,
  profileSlot,
  onAbout,
  scale = 1,
}: {
  data: { national: National }
  contributors?: number
  profileSlot?: ReactNode
  onAbout?: () => void
  /** Visual scale multiplier (1 = default). Formerly the `t` prop. */
  scale?: number
}) {
  const th = useTheme()
  const t = useT()
  const n = data.national
  return (
    <div style={{ background: th.onBg, border: `1px solid ${th.onLine}`, borderRadius: 18, padding: `${13 * scale}px ${18 * scale}px ${18 * scale}px`, color: GPT_T.ink }}>
      {/* top row: eyebrow (left) + profile chip (right) — the controls keep their corner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onAbout}
          style={{ border: 0, background: 'transparent', padding: 0, cursor: onAbout ? 'pointer' : 'default', fontSize: 10.5 * scale, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: GPT_T.ink45 }}
        >
          {t.beLight.eyebrow}
        </button>
        {profileSlot}
      </div>
      {/* centered hero block: bulb · headline · subline · stat */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 4 }}>
        <span style={{ filter: 'drop-shadow(0 0 14px rgba(224,138,0,.38))', lineHeight: 0 }}>
          <GPTIcon name="on" size={46 * scale} color={th.on} />
        </span>
        <span style={{ fontSize: 30 * scale, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.05, marginTop: 9 }}>{t.beLight.headline}</span>
        <div style={{ fontSize: 12.5 * scale, color: GPT_T.ink70, fontWeight: 600, marginTop: 7, lineHeight: 1.45, maxWidth: 290 }}>
          {t.beLight.description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 7, marginTop: 13, paddingTop: 12, borderTop: `1px solid ${th.onLine}`, width: '100%', fontSize: 12 * scale, fontWeight: 800 }}>
          <span style={{ color: th.onDeep, fontWeight: 800 }}>{t.beLight.regionsStat(n.regionsOut, n.regionsTotal)}</span>
          {contributors > 0 && <span style={{ color: GPT_T.ink45, fontWeight: 700 }}>{t.beLight.contributorsStat(contributors)}</span>}
        </div>
      </div>
    </div>
  )
}
