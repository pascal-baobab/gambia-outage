// CommunityPrivacyCard.tsx — the device's Community visibility + contact controls (Profile / "You").
// Two opt-in switches and the incoming "wave" queue:
//   • Show me in the Community  → profiles.discoverable (strict opt-in, default off)
//   • Accept contact requests   → profiles.accept_requests (pause incoming waves without hiding)
//   • Requests (N)              → accept / decline each pending wave
// Pseudonym-only; never linked to reports. People are addressed by public profile id.
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { Avatar } from '@/components/profile/Avatar'
import { useAccountId } from '@/hooks/useAccountId'
import { useContactRequests } from '@/hooks/useData'
import { fetchIntro, savePrivacy, respondContactRequest } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import type { ContactRequest } from '@/lib/types'
import { useT } from '@/i18n/useT'

function Toggle({ on, busy, onClick }: { on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={busy}
      style={{
        flexShrink: 0, width: 46, height: 28, borderRadius: 999, border: 'none', position: 'relative',
        background: on ? FLAG.green : GPT_T.line2, cursor: busy ? 'default' : 'pointer', transition: 'background .2s', opacity: busy ? 0.6 : 1,
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
    </button>
  )
}

export function CommunityPrivacyCard() {
  const t = useT()
  const accountId = useAccountId()
  const qc = useQueryClient()
  const [discoverable, setDiscoverable] = useState(false)
  const [acceptRequests, setAcceptRequests] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const { data: reqData } = useContactRequests(accountId)
  const requests = reqData?.requests ?? []

  useEffect(() => {
    if (!accountId) return
    let live = true
    fetchIntro(accountId).then((p) => {
      if (!live) return
      setDiscoverable(!!p.discoverable)
      setAcceptRequests(p.acceptRequests !== false) // default ON
      setLoaded(true)
    }).catch(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [accountId])

  async function persist(next: { discoverable: boolean; acceptRequests: boolean }) {
    if (!accountId) return
    setBusy(true)
    try {
      await savePrivacy(accountId, next)
      qc.invalidateQueries({ queryKey: qk.people(accountId) })
    } catch { /* the optimistic toggle already flipped; a refetch will reconcile */ }
    finally { setBusy(false) }
  }
  function toggleDiscoverable() {
    const v = !discoverable
    setDiscoverable(v)
    persist({ discoverable: v, acceptRequests })
  }
  function toggleAccept() {
    const v = !acceptRequests
    setAcceptRequests(v)
    persist({ discoverable, acceptRequests: v })
  }

  if (!loaded) return null

  return (
    <div style={{ marginTop: 22, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: 16, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, marginBottom: 4 }}>
        {t.communityPrivacy.sectionTitle}
      </div>
      <p style={{ fontSize: 12, color: GPT_T.ink45, fontWeight: 600, lineHeight: 1.45, margin: '0 0 14px' }}>
        {t.communityPrivacy.description}
      </p>

      {/* discoverable */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: GPT_T.ink }}>{t.communityPrivacy.discoverableLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{t.communityPrivacy.discoverableDescription}</div>
        </div>
        <Toggle on={discoverable} busy={busy} onClick={toggleDiscoverable} />
      </div>

      {/* accept requests */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', opacity: discoverable ? 1 : 0.5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: GPT_T.ink }}>{t.communityPrivacy.acceptRequestsLabel}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{t.communityPrivacy.acceptRequestsDescription}</div>
        </div>
        <Toggle on={acceptRequests} busy={busy} onClick={toggleAccept} />
      </div>

      {/* pending requests queue */}
      {requests.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${GPT_T.line}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: GPT_T.ink, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            {t.communityPrivacy.requestsHeader}
            <span style={{ background: FLAG.red, color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{requests.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map((r) => <RequestRow key={r.id} req={r} accountId={accountId} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function RequestRow({ req, accountId }: { req: ContactRequest; accountId: string | null }) {
  const t = useT()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'accept' | 'decline' | null>(null)

  async function respond(action: 'accept' | 'decline') {
    if (!accountId || busy) return
    setBusy(true)
    try {
      await respondContactRequest(accountId, req.id, action)
      setDone(action)
      qc.invalidateQueries({ queryKey: qk.contactRequests(accountId) })
    } catch { /* leave it in the queue to retry */ }
    finally { setBusy(false) }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: GPT_FONT }}>
        <Avatar avatarId={req.avatarId} size={36} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: GPT_T.ink45 }}>
          {req.nickname} · {done === 'accept' ? t.communityPrivacy.connected : t.communityPrivacy.declined}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: GPT_FONT }}>
      <Avatar avatarId={req.avatarId} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.nickname}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {req.zoneName ? `📍 ${req.zoneName} · ` : ''}{t.communityPrivacy.requestSubtitle}
        </div>
      </div>
      <button onClick={() => respond('decline')} disabled={busy} style={{ flexShrink: 0, border: `1.5px solid ${GPT_T.line}`, background: 'transparent', color: GPT_T.ink70, borderRadius: 999, padding: '6px 11px', fontFamily: GPT_FONT, fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer' }}>{t.communityPrivacy.declineBtn}</button>
      <button onClick={() => respond('accept')} disabled={busy} style={{ flexShrink: 0, border: 'none', background: FLAG.green, color: '#fff', borderRadius: 999, padding: '7px 13px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{t.communityPrivacy.acceptBtn}</button>
    </div>
  )
}
