// CommunityFeed.tsx — national community feed strip for Home. Summarises the latest notes across
// ALL quarters (snapshot.feed, built server-side), each tagged with its originating quarter so
// neighbours' voices are visible immediately without drilling into a region. "See all" → Community.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'
import type { NoteItem } from '@/lib/types'

export function CommunityFeed({
  notes,
  onSeeAll,
  inset = 16,
  title,
}: {
  notes: NoteItem[]
  onSeeAll?: () => void
  inset?: number
  title?: string
}) {
  const t = useT()
  const effectiveTitle = title ?? t.zone.communityFeedTitle
  if (!notes || notes.length === 0) return null
  return (
    <div style={{ padding: `4px ${inset}px 8px` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 8px' }}>
        <div style={{ fontFamily: GPT_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>
          {effectiveTitle}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700, color: GPT_T.ink70, padding: 0 }}
          >
            See all <GPTIcon name="chevron" size={14} color={GPT_T.ink70} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notes.map((n, i) => (
          <div key={i} style={{ background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 13.5, color: GPT_T.ink, lineHeight: 1.4, fontWeight: 500 }}>{n.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: GPT_T.ink, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n.at || n.t}</span>
              {n.where && (
                <span style={{ fontSize: 11, color: GPT_T.ink45, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <GPTIcon name="pin" size={11} color={GPT_T.ink45} /> {n.where}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
