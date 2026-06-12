// PeopleSection.tsx — "People nearby": the opt-in neighbour directory inside the Community tab.
// Shows discoverable neighbours (avatar + nickname + home zone + rank) and lets you send a lightweight
// "wave" — a contact request the other person accepts or declines (no messaging in v1). Pseudonym-only:
// people are addressed by their PUBLIC profile id, never their account_id, and none of this is ever
// linked to outage reports.
// Layout (owner 2026-06-10): a 2-column CARD GRID — the flat row list read like a generic classifieds
// portal; avatar-led cards read as faces of a neighbourhood instead.
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { Avatar } from '@/components/profile/Avatar'
import { useAccountId } from '@/hooks/useAccountId'
import { usePeople } from '@/hooks/useData'
import { sendWave, blockPerson, savePrivacy, fetchIntro } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { useT } from '@/i18n/useT'
import type { Person } from '@/lib/types'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { NameGateSheet } from '@/components/shared/NameGateSheet'

export function PeopleSection({ onToast }: { onToast?: (text: string) => void }) {
  const t = useT()
  const accountId = useAccountId()
  const qc = useQueryClient()
  const { data: people, isLoading } = usePeople(accountId)
  const [discoverable, setDiscoverable] = useState<boolean | null>(null)
  const [busyVis, setBusyVis] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)

  // Read the viewer's own visibility state (so we can nudge them to opt in).
  useEffect(() => {
    if (!accountId) return
    let live = true
    fetchIntro(accountId).then((p) => { if (live) setDiscoverable(!!p.discoverable) }).catch(() => { if (live) setDiscoverable(false) })
    return () => { live = false }
  }, [accountId])

  async function becomeVisible() {
    if (!hasClaimedName()) { setNameRequired(true); return }
    if (!accountId) return
    setBusyVis(true)
    try {
      await savePrivacy(accountId, { discoverable: true, acceptRequests: true })
      setDiscoverable(true)
      qc.invalidateQueries({ queryKey: qk.people(accountId) })
      onToast?.(t.people.visibleToast)
    } catch { onToast?.(t.people.updateErrorToast) }
    finally { setBusyVis(false) }
  }

  const list = people ?? []

  return (
    <section style={{ position: 'relative' }}>
      {/* section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink, fontFamily: GPT_FONT }}>{t.people.title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45 }}>{t.people.sub}</div>
      </div>

      {/* opt-in nudge — only while the viewer isn't discoverable yet */}
      {discoverable === false && (
        <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 14, padding: '13px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{t.people.nudgeTitle}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 2, lineHeight: 1.4 }}>
              {t.people.nudgeDescription}
            </div>
          </div>
          <button
            onClick={becomeVisible}
            disabled={busyVis}
            style={{ flexShrink: 0, border: 'none', background: FLAG.green, color: '#fff', borderRadius: 999, padding: '9px 14px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: busyVis ? 'default' : 'pointer', opacity: busyVis ? 0.6 : 1 }}
          >
            {t.people.showMe}
          </button>
        </div>
      )}

      {/* people list */}
      {isLoading && list.length === 0 && (
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, padding: '6px 2px' }}>{t.people.loading}</div>
      )}
      {!isLoading && list.length === 0 && (
        <div style={{ background: GPT_T.paper, border: `1px dashed ${GPT_T.line}`, borderRadius: 14, padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GPT_T.ink70 }}>{t.people.emptyTitle}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 3 }}>{t.people.emptyDescription}</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {list.map((p) => (
          <PersonRow key={p.id} person={p} accountId={accountId} onToast={onToast} />
        ))}
      </div>
      {nameRequired && (
        <NameGateSheet
          onClose={() => setNameRequired(false)}
          onOpenNameGate={() => { setNameRequired(false); openNameGate() }}
        />
      )}
    </section>
  )
}

function PersonRow({ person, accountId, onToast }: { person: Person; accountId: string | null; onToast?: (t: string) => void }) {
  const t = useT()
  const qc = useQueryClient()
  const [status, setStatus] = useState(person.waveStatus)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)

  async function wave() {
    if (!hasClaimedName()) { setNameRequired(true); return }
    if (!accountId || busy) return
    setBusy(true)
    setStatus('pending') // optimistic
    try {
      const r = await sendWave(accountId, person.id)
      setStatus(r.status)
      onToast?.(t.people.waveSentToast)
    } catch { setStatus('none'); onToast?.(t.people.waveErrorToast) }
    finally { setBusy(false) }
  }

  async function block() {
    if (!accountId) return
    setMenu(false)
    setHidden(true) // optimistic remove
    try {
      await blockPerson(accountId, person.id)
      qc.invalidateQueries({ queryKey: qk.people(accountId) })
      onToast?.(t.people.blockedToast)
    } catch { setHidden(false); onToast?.(t.people.blockErrorToast) }
  }

  if (hidden) return null

  return (
    // Card layout (owner 2026-06-10): avatar-led vertical card in a 2-col grid — not a list row.
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 7, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, padding: '14px 10px 10px', fontFamily: GPT_FONT }}>
      <Avatar avatarId={person.avatarId} size={56} />
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.nickname}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: GPT_T.ink45, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {person.zoneName ? `📍 ${person.zoneName}` : person.rankLabel}
        </div>
        {person.zoneName && (
          <div style={{ fontSize: 10.5, fontWeight: 600, color: GPT_T.ink25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.rankLabel}</div>
        )}
      </div>

      {/* wave action / status */}
      <WaveButton status={status} canWave={person.canWave} busy={busy} onWave={wave} />

      {/* overflow → block (top corner of the card) */}
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label={t.people.moreAria}
        style={{ position: 'absolute', top: 4, insetInlineEnd: 6, border: 'none', background: 'transparent', color: GPT_T.ink25, fontSize: 17, fontWeight: 800, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
      >
        ⋯
      </button>
      {menu && (
        <div style={{ position: 'absolute', top: 26, insetInlineEnd: 6, zIndex: 5, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 10, boxShadow: '0 6px 18px rgba(15,23,34,0.12)', overflow: 'hidden' }}>
          <button onClick={block} style={{ border: 'none', background: 'transparent', color: ACCENT.danger, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13, padding: '10px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.people.block}</button>
        </div>
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

function WaveButton({ status, canWave, busy, onWave }: { status: Person['waveStatus']; canWave: boolean; busy: boolean; onWave: () => void }) {
  const t = useT()
  if (status === 'accepted') {
    return <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: FLAG.green, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{t.people.waveAccepted}</span>
  }
  if (status === 'pending') {
    return <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: GPT_T.ink45 }}>{t.people.wavePending}</span>
  }
  if (status === 'declined' || !canWave) {
    return <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: GPT_T.ink25 }}>—</span>
  }
  return (
    <button
      onClick={onWave}
      disabled={busy}
      style={{ flexShrink: 0, border: `1.5px solid ${FLAG.green}`, background: 'transparent', color: FLAG.green, borderRadius: 999, padding: '7px 13px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
    >
      {t.people.waveBtn}
    </button>
  )
}
