// StoryCard.tsx — one community "Outage story" (or zone comment). Pseudonym-attributed
// (avatar + nickname), never linked to reports. Pure presentation.
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { Avatar } from '@/components/profile/Avatar'
import { useAdminDelete } from '@/hooks/useAdminDelete'
import { useT } from '@/i18n/useT'
import type { ModType } from '@/lib/admin'

export function StoryCard({
  nickname,
  avatarId,
  body,
  ago,
  zoneName,
  onOpenZone,
  zoneId,
  modType,
  modId,
  onModDeleted,
}: {
  nickname: string
  avatarId: string
  body: string
  ago: string
  zoneName?: string | null
  zoneId?: string | null
  onOpenZone?: (id: string) => void
  /** When set + the device is in superadmin mode, long-press the card to delete this content. */
  modType?: ModType
  modId?: string
  onModDeleted?: () => void
}) {
  const t = useT()
  const name = nickname?.trim() || t.stories.anonymous
  const mod = useAdminDelete(modType ?? 'post', modId, onModDeleted, 'messaggio')
  return (
    <div {...mod.bind} style={{ display: 'flex', gap: 11, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: '12px 13px', fontFamily: GPT_FONT, ...mod.ring }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>{avatarId ? <Avatar avatarId={avatarId} size={34} /> : null}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{name}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{ago}</span>
        </div>
        <div style={{ fontSize: 14, color: GPT_T.ink70, lineHeight: 1.45, marginTop: 3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</div>
        {zoneName && (
          <button
            onClick={() => zoneId && onOpenZone?.(zoneId)}
            disabled={!zoneId || !onOpenZone}
            style={{ marginTop: 7, fontSize: 11.5, fontWeight: 700, color: GPT_T.ink45, background: GPT_T.wash, border: `1px solid ${GPT_T.line}`, borderRadius: 999, padding: '3px 10px', cursor: zoneId && onOpenZone ? 'pointer' : 'default', fontFamily: GPT_FONT }}
          >
            📍 {zoneName}
          </button>
        )}
      </div>
    </div>
  )
}
