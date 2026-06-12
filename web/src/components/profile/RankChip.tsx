// RankChip.tsx — compact Home XP progress card. Renders ONLY once the device has earned XP
// (returns null at 0 XP / no profile) so a fresh user sees nothing until they've contributed.
// On-brand light card, consistent with the other Home content cards.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useProfile } from '@/hooks/useProfile'
import { RANKS } from '@/lib/xp'
import { XpBar } from '@/components/profile/XpBar'

export function RankChip() {
  const th = useTheme()
  const p = useProfile()
  if (!p || p.xp === 0) return null
  const nextLabel = p.nextRank ? RANKS.find((r) => r.key === p.nextRank)?.label ?? null : null
  return (
    <div
      style={{
        margin: '10px 16px 2px',
        padding: '11px 14px',
        borderRadius: 14,
        background: GPT_T.paper,
        border: `1px solid ${GPT_T.line}`,
        boxShadow: '0 1px 2px rgba(15,23,34,0.04)',
        fontFamily: GPT_FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: GPT_T.ink70, fontWeight: 600, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: th.partial, flexShrink: 0 }} />
        <span>
          You're <strong style={{ color: GPT_T.ink, fontWeight: 800 }}>{p.rankLabel}</strong> · {p.xp} XP
          {nextLabel ? <span style={{ color: GPT_T.ink45 }}> · {p.toNext} to {nextLabel}</span> : <span style={{ color: GPT_T.ink45 }}> · top rank</span>}
        </span>
      </div>
      <XpBar xp={p.xp} toNext={p.toNext} nextLabel={nextLabel} />
    </div>
  )
}
