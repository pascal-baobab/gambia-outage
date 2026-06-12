// WallOfHonorTeaser.tsx — compact Wall-of-Honor entry on Home, below the region bars. Shows the most
// "Hours in the Dark" neighbourhood this week and links to the full board (HonorsScreen). Renders
// nothing until the community board has data, so it never shows an empty shell.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { useCommunity } from '@/hooks/useData'
import { navigate } from '@/hooks/useHashRoute'
import { fmtHM } from '@/lib/format'
import { useT } from '@/i18n/useT'

export function WallOfHonorTeaser() {
  const t = useT()
  const th = useTheme()
  const { data } = useCommunity()
  const hours = data?.hours ?? []
  if (hours.length === 0) return null
  const top = hours[0] // ranked worst-first
  const others = hours.length - 1

  return (
    <button
      onClick={() => navigate({ name: 'honors' })}
      aria-label={t.wallOfHonor.openAria}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: 'calc(100% - 24px)', margin: '10px 12px 0', textAlign: 'start', background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, padding: '12px 14px', cursor: 'pointer', fontFamily: GPT_FONT }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: th.outBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GPTIcon name="out" size={22} color={th.out} strokeColor={th.outBg} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: GPT_T.ink45 }}>{t.wallOfHonor.title}</span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {top.name} · {fmtHM(top.darkMinutes)}{t.wallOfHonor.dark}
        </span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GPT_T.ink45 }}>
          {others > 0 ? t.wallOfHonor.subtitleMore(others) : t.wallOfHonor.subtitle}
        </span>
      </span>
      <GPTIcon name="chevron" size={18} color={GPT_T.ink25} />
    </button>
  )
}
