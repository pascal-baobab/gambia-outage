// ZoneDiscussion.tsx — per-zone comment thread (composer + list) under the device pseudonym.
// Distinct from the report-`notes` "Community feed": this is free discussion for the area. Never
// linked to reports. Server-side automatic moderation (sanitise + per-account caps).
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { createComment, fetchZoneComments } from '@/lib/api'
import { useT } from '@/i18n/useT'
import type { ZoneComment } from '@/lib/types'
import { StoryCard } from './StoryCard'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'

export function ZoneDiscussion({ zoneId, onToast }: { zoneId: string; onToast?: (text: string) => void }) {
  const t = useT()
  const [comments, setComments] = useState<ZoneComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  const acct = useRef<{ id: string; nickname: string; avatarId: string } | null>(null)

  useEffect(() => {
    let live = true
    getAccountId().then((id) => {
      const idn = getIdentity(id)
      acct.current = { id, nickname: idn.nickname ?? '', avatarId: idn.avatarId }
    }).catch(() => {})
    fetchZoneComments(zoneId, 100).then((c) => { if (live) setComments(c) }).catch(() => { if (live) setComments([]) })
    return () => { live = false }
  }, [zoneId])

  async function submit() {
    if (!hasClaimedName()) { setNameRequired(true); return }
    const body = draft.trim()
    if (!body || busy || !acct.current) return
    setBusy(true)
    try {
      const created = await createComment({ account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId, zone: zoneId, body })
      setComments((prev) => [created, ...(prev ?? [])])
      setDraft('')
    } catch (err) {
      onToast?.(err instanceof Error && err.message ? err.message : t.zoneDiscussion.errorToast)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'relative', padding: '14px 16px 4px', fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink }}>{t.zoneDiscussion.title}</div>
      <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 1, marginBottom: 11 }}>
        {t.zoneDiscussion.description}
      </div>
      <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 11, marginBottom: 11 }}>
        <textarea
          value={draft}
          maxLength={240}
          rows={2}
          placeholder={t.zoneDiscussion.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: 'transparent', lineHeight: 1.45 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{draft.length}/240</span>
          <button
            onClick={submit}
            disabled={!draft.trim() || busy}
            style={{ height: 34, padding: '0 16px', borderRadius: 9, border: 'none', background: draft.trim() && !busy ? FLAG.green : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 800, cursor: draft.trim() && !busy ? 'pointer' : 'default' }}
          >
            {busy ? t.zoneDiscussion.submitting : t.zoneDiscussion.post}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments === null ? (
          <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600 }}>{t.zoneDiscussion.loading}</div>
        ) : comments.length === 0 ? (
          <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.5 }}>{t.zoneDiscussion.empty}</div>
        ) : (
          comments.map((c) => (
            <StoryCard key={c.id} nickname={c.nickname} avatarId={c.avatarId} body={c.body} ago={c.ago} modType="comment" modId={c.id} onModDeleted={() => setComments((prev) => (prev ?? []).filter((x) => x.id !== c.id))} />
          ))
        )}
      </div>
      {nameRequired && (
        <NameGateSheet
          onClose={() => setNameRequired(false)}
          onOpenNameGate={() => { setNameRequired(false); openNameGate() }}
        />
      )}
    </div>
  )
}
