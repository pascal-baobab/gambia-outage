// BadgeRow.tsx — earned quarter-level milestone badges (Phase 5). Quarter-level, never per-person.
// Renders nothing when no badges are earned (cold-start at launch → empty). Sober, civic styling.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'
import type { Badge } from '@/lib/types'

export function BadgeRow({ badges }: { badges: Badge[] }) {
  const t = useT()
  const th = useTheme()
  if (!badges || badges.length === 0) return null
  return (
    <div style={{ fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: GPT_T.ink45, letterSpacing: 0.5, textTransform: 'uppercase', margin: '4px 0 8px' }}>
        {t.community.badgesTitle}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {badges.map((b, i) => (
          <span
            key={`${b.zoneId}-${b.key}-${i}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, background: th.onBg, border: `1px solid ${th.onLine}`, color: th.onDeep, fontSize: 12.5, fontWeight: 800 }}
          >
            <GPTIcon name="shield" size={14} color={th.onDeep} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}
