// StoriesSection.tsx — community "Outage stories" feed + composer. Self-managing: loads the feed,
// posts under the device pseudonym (avatar + nickname), prepends optimistically. Persistent
// pseudonym, never linked to reports. Moderation is server-side automatic (sanitise + caps).
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { getAccountId } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { createPost } from '@/lib/api'
import { useFeed } from '@/hooks/useData'
import { qk } from '@/lib/queryKeys'
import { useT } from '@/i18n/useT'
import type { Post } from '@/lib/types'
import { StoryCard } from './StoryCard'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'

export function StoriesSection({ onOpenZone, onToast }: { onOpenZone?: (id: string) => void; onToast?: (text: string) => void }) {
  const t = useT()
  // Shared cache (useFeed) — returning to the Community tab renders the feed instantly from cache.
  const { data: posts = null } = useFeed()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  const acct = useRef<{ id: string; nickname: string; avatarId: string } | null>(null)

  useEffect(() => {
    getAccountId().then((id) => {
      const idn = getIdentity(id)
      acct.current = { id, nickname: idn.nickname ?? '', avatarId: idn.avatarId }
    }).catch(() => {})
  }, [])

  async function submit() {
    if (!hasClaimedName()) { setNameRequired(true); return }
    const body = draft.trim()
    if (!body || busy || !acct.current) return
    setBusy(true)
    try {
      const created = await createPost({ account_id: acct.current.id, nickname: acct.current.nickname, avatar_id: acct.current.avatarId, body })
      // Prepend into the shared cache so the new post shows immediately on every feed surface.
      qc.setQueryData<Post[]>(qk.feed, (prev) => [created, ...(prev ?? [])])
      setDraft('')
    } catch (err) {
      onToast?.(err instanceof Error && err.message ? err.message : 'Could not post — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 11, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: GPT_T.ink45 }}>
        {t.stories.title}
      </div>
      {/* composer */}
      <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 13, padding: 11 }}>
        <textarea
          value={draft}
          maxLength={280}
          rows={2}
          placeholder={t.stories.composer}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: GPT_FONT, fontSize: 14.5, color: GPT_T.ink, background: 'transparent', lineHeight: 1.45 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{draft.length}/280 {t.stories.staysAnonymous}</span>
          <button
            onClick={submit}
            disabled={!draft.trim() || busy}
            style={{ height: 34, padding: '0 16px', borderRadius: 9, border: 'none', background: draft.trim() && !busy ? FLAG.green : GPT_T.line, color: '#fff', fontFamily: GPT_FONT, fontSize: 13, fontWeight: 800, cursor: draft.trim() && !busy ? 'pointer' : 'default' }}
          >
            {busy ? t.zoneDiscussion.submitting : t.stories.post}
          </button>
        </div>
      </div>
      {/* list */}
      {posts === null ? (
        <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600, padding: '6px 2px' }}>{t.zoneDiscussion.loading}</div>
      ) : posts.length === 0 ? (
        <div style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600, padding: '6px 2px', lineHeight: 1.5 }}>
          {t.stories.empty}
        </div>
      ) : (
        posts.map((p) => (
          <StoryCard key={p.id} nickname={p.nickname} avatarId={p.avatarId} body={p.body} ago={p.ago} zoneName={p.zoneName} zoneId={p.zoneId} onOpenZone={onOpenZone} modType="post" modId={p.id} onModDeleted={() => qc.invalidateQueries({ queryKey: qk.feed })} />
        ))
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
