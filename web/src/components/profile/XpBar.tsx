import { GPT_T } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'

export function XpBar({ xp, toNext, nextLabel }: { xp: number; toNext: number; nextLabel: string | null }) {
  const t = useT()
  const th = useTheme()
  const span = xp + toNext
  const pct = span > 0 ? Math.min(100, Math.round((xp / span) * 100)) : 100
  return (
    <div>
      <div style={{ height: 8, borderRadius: 4, background: GPT_T.line }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: th.partial }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: GPT_T.ink70 }}>
        {nextLabel ? t.xpBar.progress(toNext, nextLabel) : t.xpBar.topRank}
      </div>
    </div>
  )
}
