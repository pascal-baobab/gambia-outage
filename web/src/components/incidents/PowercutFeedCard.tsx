// PowercutFeedCard.tsx — feed card for a "power cut" entry (a quarter dark right now).
// Mirrors IncidentFeedCard's shape so the two read as one feed, but the data is a read-only
// snapshot signal (zone name + "dark since"), never a reportable incident. The slate "power cut"
// palette + unlit-bulb glyph distinguish it. RTL-aware. Token-only (D-12).
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { CATEGORY_COLOR, catText, CatGlyph, PhotoThumb, POWERCUT_SLUG } from './incidentVisuals'
import type { PowercutEntry } from './powercutFeed'

export function PowercutFeedCard({ entry }: { entry: PowercutEntry }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const color = CATEGORY_COLOR[POWERCUT_SLUG]
  const txt = catText(POWERCUT_SLUG)
  const label = (t.incidents.categories as Record<string, string>).powercut

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        background: GPT_T.paper2,
        border: `1px solid ${GPT_T.line}`,
        borderRadius: 14,
        marginBottom: 8,
        fontFamily: GPT_FONT,
        alignItems: 'flex-start',
        flexDirection: rtl ? 'row-reverse' : 'row',
      }}
    >
      <PhotoThumb slug={POWERCUT_SLUG} size={64} />

      <div style={{ flex: 1, minWidth: 0, textAlign: rtl ? 'right' : 'left' }}>
        <div style={{ marginBottom: 5 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              color: txt,
              background: color,
              letterSpacing: 0.2,
            }}
          >
            <CatGlyph slug={POWERCUT_SLUG} size={12} color={txt} /> {label}
          </span>
        </div>
        {/* Zone name */}
        <div style={{ fontSize: 13.5, fontWeight: 700, color: GPT_T.ink, lineHeight: 1.4, marginBottom: 3 }}>{entry.name}</div>
        {/* Dark since … */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>
          {entry.since ? `${t.incidents.powercutSince} ${entry.since}` : t.incidents.categories.powercut}
        </div>
      </div>
    </div>
  )
}
