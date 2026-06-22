// IncidentFeedCard.tsx — chronological feed card for one IncidentRow.
// Displays the thumbnail, localized category label, text body, and relative time.
// Token-only styling (GPT_T/FLAG/ACCENT from @/lib/tokens — D-12). No raw hex except '#fff'.
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import type { IncidentRow } from '@/lib/api'

// Category → token accent color for the label pill (mirrors INCIDENT_CATEGORY_COLOR in GambiaMapLive).
// All values from FLAG/ACCENT tokens — zero raw hex (D-12).
const CATEGORY_COLOR: Record<string, string> = {
  flooding: FLAG.blue,
  road: ACCENT.amber,
  water: ACCENT.tile5,
  electricity: ACCENT.star,
  waste: GPT_T.ink45,
  building: FLAG.red,
  other: ACCENT.tile4,
}

export function IncidentFeedCard({ row }: { row: IncidentRow }) {
  const t = useT()
  const color = CATEGORY_COLOR[row.category] ?? ACCENT.tile4
  // Localized category label — falls back to raw slug if translation key is missing (should not happen).
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
      }}
    >
      {/* Thumbnail — only rendered when the feed provides a photoUrl */}
      {row.photoUrl && (
        <img
          src={row.photoUrl}
          alt={label}
          width={64}
          height={64}
          style={{
            width: 64,
            height: 64,
            objectFit: 'cover',
            borderRadius: 10,
            flexShrink: 0,
            background: GPT_T.wash,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Category label pill */}
        <div style={{ marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 9px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              color: '#fff',
              background: color,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </span>
        </div>
        {/* Description text (server-sanitised before storage) */}
        {row.text ? (
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: GPT_T.ink,
              lineHeight: 1.45,
              marginBottom: 4,
            }}
          >
            {row.text}
          </div>
        ) : null}
        {/* Relative time */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{row.ago}</div>
      </div>
    </div>
  )
}
