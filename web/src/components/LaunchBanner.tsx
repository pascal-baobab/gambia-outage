// LaunchBanner.tsx — fixed launch notice, shown while the estimated-blackout baseline is active
// (the first ~3 days). Explains that the country is in a NAWEC load-shedding blackout, that the
// figures are estimated averages until confirmed by neighbours, and that only shared effort makes
// the map match reality. Not dismissible by design — it is the honesty contract for the baseline.
//
// Visual: a WARM editorial card (cream, not another near-black slab) with a dusty-red accent edge, so
// it reads like a serious newspaper alert above the black hero rather than a third heavy dark block.
import { GPT_T, GPT_FONT, THEMES } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { launchBannerOn } from '@/lib/launch'

export function LaunchBanner() {
  if (!launchBannerOn()) return null
  const accent = THEMES.standard.estimated // dusty red — "estimated dark", distinct from confirmed red
  return (
    <div
      role="note"
      style={{
        flexShrink: 0,
        background: GPT_T.paper2,
        color: GPT_T.ink,
        padding: '7px 13px 8px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        fontFamily: GPT_FONT,
        borderBottom: `1px solid ${GPT_T.line}`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <span style={{ width: 24, height: 24, borderRadius: 8, background: '#fff', border: `1px solid ${THEMES.standard.estimatedLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <GPTIcon name="estimated" size={14} color={accent} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25, color: GPT_T.ink }}>
          Launched 1 June 2026 · most of The Gambia has been out of power for 3 weeks
        </div>
        <div style={{ fontSize: 11, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.35, marginTop: 2 }}>
          Estimated averages until confirmed by neighbours. Tap “Power back” the moment yours returns.
        </div>
      </div>
    </div>
  )
}
