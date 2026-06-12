// PostComments.tsx — collapsible comment thread under a "From Facebook" card (target_type='social').
// Same pseudonym model as ZoneDiscussion; never linked to reports. Auto-moderated server-side.
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { createComment, fetchComments } from '@/lib/api'
import type { ZoneComment } from '@/lib/types'
import { StoryCard } from './StoryCard'
import { useT } from '@/i18n/useT'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'

// Comment thread under a social card. Defaults to the owner-curated 'social' target; pass
// targetType='community_link' (+ targetId) for user-submitted community links. `socialId` is the
// back-compat alias for the From-Facebook cards.
export function PostComments({ socialId, targetType = 'social', targetId }: { socialId?: string; targetType?: 'social' | 'community_link'; targetId?: string }) {
  const t = useT()
  const tid = targetId ?? socialId ?? ''
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ZoneComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  const acct = useRef<{ id: string; nickname: string; avatarId: string } | null>(null)

  useEffect(() => {
    getAccountId().then((id) => { const i = getIdentity(id); acct.current = { id, nickname: i.nickname ?? '', avatarId: i.avatarId } }).catch(() => {})
  }, [])
  useEffect(() => {
    if (!open || items !== null) return
    let live = true
    fetchComments(targetType, tid, 100).then((c) => { if (live) setItems(c) }).catch(() => { if (live) setItems([]) })
    return () => { live = false }
  }, [open, items, targetType, tid])

  async function submit() {
    if (!hasClaimedName()) { setNameRequired(true); return }
    const body = draft.trim()
    if (!body || busy || !acct.current) return
    setBusy(true)
    try {
      const created = await createComment({ account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId, target_type: targetType, target_id: tid, body })
      setItems((prev) => [created, ...(prev ?? [])])
      setDraft('')
    } catch { /* keep draft on error */ } finally { setBusy(false) }
  }

  const count = items?.length ?? 0
  return (
    <div style={{ position: 'relative', borderTop: `1px solid ${GPT_T.line2}`, padding: '6px 12px 10px', fontFamily: GPT_FONT }}>
      <button onClick={() => setOpen((o) => !o)} style={{ border: 0, background: 'transparent', color: GPT_T.ink45, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '4px 0' }}>
        💬 {open ? t.comments.hide : count ? t.comments.count(String(count)) : t.comments.add}
      </button>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 8 }}>
            <textarea
              value={draft}
              maxLength={240}
              rows={2}
              placeholder={t.comments.placeholder}
              onChange={(e) => setDraft(e.target.value)}
              style={{ flex: 1, boxSizing: 'border-box', border: `1px solid ${GPT_T.line}`, borderRadius: 10, padding: 8, resize: 'none', fontFamily: GPT_FONT, fontSize: 13.5, color: GPT_T.ink, outline: 'none' }}
            />
            <button
              onClick={submit}
              disabled={!draft.trim() || busy}
              style={{ alignSelf: 'flex-end', height: 34, padding: '0 14px', borderRadius: 9, border: 0, background: draft.trim() && !busy ? FLAG.green : GPT_T.line, color: '#fff', fontWeight: 800, fontSize: 13, cursor: draft.trim() && !busy ? 'pointer' : 'default' }}
            >
              {busy ? '…' : t.comments.send}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(items ?? []).map((c) => (
              <StoryCard key={c.id} nickname={c.nickname} avatarId={c.avatarId} body={c.body} ago={c.ago} />
            ))}
          </div>
        </>
      )}
      {nameRequired && (
        <NameGateSheet
          onClose={() => setNameRequired(false)}
          onOpenNameGate={() => { setNameRequired(false); openNameGate() }}
        />
      )}
    </div>
  )
}
