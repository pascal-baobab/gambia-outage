// IncidentFeedCard.tsx — chronological feed card for one IncidentRow (claude-design pass).
// Photo-left thumbnail (the real EXIF-stripped JPEG when present, else a category-tinted
// placeholder), a category pill carrying its glyph + locked palette with the AA contrast rule,
// the description body, and the relative time. RTL-aware.
// Token-only styling (D-12) — '#fff' only via the shared catText().
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import type { IncidentRow } from '@/lib/api'
import { CATEGORY_COLOR, catText, CatGlyph, PhotoThumb } from './incidentVisuals'

export function IncidentFeedCard({ row }: { row: IncidentRow }) {
  const t = useT()
  const { lang } = useLang()
  const rtl = lang === 'ar'
  const color = CATEGORY_COLOR[row.category] ?? CATEGORY_COLOR.other
  const txt = catText(row.category)
  // Localized category label — falls back to raw slug if a translation key is missing (should not happen).
  const label = (t.incidents.categories as Record<string, string>)[row.category] ?? row.category

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
      {/* Thumbnail — real photo when the feed provides one, else the category-tinted placeholder. */}
      {row.photoUrl ? (
        <img
          src={row.photoUrl}
          alt={label}
          width={64}
          height={64}
          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flexShrink: 0, background: GPT_T.wash, border: `1px solid ${GPT_T.line}` }}
        />
      ) : (
        <PhotoThumb slug={row.category} size={64} />
      )}

      <div style={{ flex: 1, minWidth: 0, textAlign: rtl ? 'right' : 'left' }}>
        {/* Category pill with glyph */}
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
            <CatGlyph slug={row.category} size={12} color={txt} /> {label}
          </span>
        </div>
        {/* Description text (server-sanitised before storage) */}
        {row.text ? (
          <div style={{ fontSize: 13.5, fontWeight: 500, color: GPT_T.ink, lineHeight: 1.45, marginBottom: 5 }}>{row.text}</div>
        ) : null}
        {/* Relative time */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{row.ago}</div>
      </div>
    </div>
  )
}
