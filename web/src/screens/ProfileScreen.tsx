// ProfileScreen.tsx — anonymous device profile. Leads with a DEVICE-LOCAL identity (avatar +
// optional nickname — never sent to the server, see lib/identity), then rank, XP progress, badges,
// streak, the device-local "My reports" card, and community social proof. account_id is a local
// capability; no PII, no login.
import { useEffect, useState } from 'react'
import { getAccountId } from '@/lib/account'
import { fetchProfile } from '@/lib/api'
import { useT } from '@/i18n/useT'
import { hasClaimedName } from '@/lib/username'
import { openNameGate } from '@/app/nameGateStore'
import { getProfile, setProfile } from '@/lib/profileStore'
import { useProfile } from '@/hooks/useProfile'
import { getIdentity, getHomeZone, onIdentityChange, type Identity } from '@/lib/identity'
import { RANKS, rankFor } from '@/lib/xp'
import { Avatar } from '@/components/profile/Avatar'
import { RankBadge } from '@/components/profile/RankBadge'
import { XpBar } from '@/components/profile/XpBar'
import { BadgeChip } from '@/components/profile/BadgeChip'
import { ContributorsBadge } from '@/components/profile/ContributorsBadge'
import { MyReportsCard } from '@/components/profile/MyReportsCard'
import { CommunityPrivacyCard } from '@/components/profile/CommunityPrivacyCard'
import { AccountSecurity } from '@/components/profile/AccountSecurity'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { StatusStripConnected } from '@/components/shared/StatusStripConnected'
import { FlagRule } from '@/components/Flag'
import { AmbassadorCodeClaim, AmbassadorRequestForm } from './profile/AmbassadorCards'
import { IdentityEditor } from './profile/IdentityEditor'

export function ProfileScreen() {
  const t = useT()
  const th = useTheme()
  // Read the live profile from the shared store — it's already populated by the app-load fetch in
  // App.tsx, so opening the "You" tab shows rank/XP immediately instead of flashing "Loading…".
  const p = useProfile()
  const [loaded, setLoaded] = useState(getProfile() !== null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let live = true
    getAccountId().then((id) => {
      if (!live) return
      setAccountId(id)
      setIdentity(getIdentity(id))
      // Refresh in the background and push into the shared store (keeps the header chip live too).
      return fetchProfile(id).then((pr) => { if (live) { setProfile(pr); setLoaded(true) } })
    }).catch(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])

  // re-render after nickname/avatar edits (they persist immediately to localStorage)
  useEffect(() => {
    if (!accountId) return
    return onIdentityChange(() => setIdentity(getIdentity(accountId)))
  }, [accountId])

  const xp = p?.xp ?? 0
  const rankLabel = p?.rankLabel ?? rankFor(xp).label
  const nextLabel = p && p.nextRank ? (RANKS.find((r) => r.key === p.nextRank)?.label ?? null) : null
  const nickname = identity?.nickname || t.profile.anonymous
  const avatarId = identity?.avatarId
  // M3-D: name-claim nudge is dismissible (persisted) — it used to reappear on every visit forever.
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return localStorage.getItem('go_name_nudge_dismissed') === '1' } catch { return false }
  })
  const dismissNudge = () => {
    setNudgeDismissed(true)
    try { localStorage.setItem('go_name_nudge_dismissed', '1') } catch { /* storage unavailable */ }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: GPT_T.wash, fontFamily: GPT_FONT }}>
      {/* Slim section header (the global AppHeader owns the brand bar + notch clearance). */}
      <div style={{ background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, flexShrink: 0 }}>
        <div style={{ padding: '12px 16px 10px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.profile.screenTitle}</div>
        </div>
        <FlagRule height={3} radius={0} style={{ width: '100%' }} />
      </div>
      {/* 7-region status strip, under the header (present on every primary tab). */}
      <StatusStripConnected />

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 16px 32px' }}>
        {!loaded && !identity && <p style={{ color: GPT_T.ink70 }}>{t.profile.loading}</p>}

        {!hasClaimedName() && (
          <>
            {/* M3-D: dismissible — the nudge used to reappear forever; one ✕ remembers the choice.
                The claim path stays reachable (this same card's CTA until dismissed, NameGate after). */}
            {!nudgeDismissed && (
            <div style={{ background: th.onBg, border: `1px solid ${th.onLine}`, borderRadius: 14, padding: '13px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{t.profile.nameNudgeTitle}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 2, lineHeight: 1.4 }}>{t.profile.nameNudgeSub}</div>
              </div>
              <button
                onClick={() => openNameGate('create')}
                style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 10, border: 'none', background: th.on, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {t.profile.nameNudgeCta}
              </button>
              <button
                onClick={dismissNudge}
                aria-label={t.profile.nameNudgeDismissAria}
                style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, border: 'none', background: 'transparent', color: GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            )}
            {/* Already-a-user path: recover an existing account (other phone) by name + password. */}
            <button
              onClick={() => openNameGate('recover')}
              style={{ width: '100%', marginBottom: 16, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.wash, color: GPT_T.ink70, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'center' }}
            >
              {t.nameGate.recoverLink} <b style={{ color: GPT_T.ink }}>{t.nameGate.recoverLinkBold}</b>
            </button>
          </>
        )}

        {identity && (
          <>
            {/* identity header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {avatarId && <Avatar avatarId={avatarId} size={72} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nickname}
                </div>
                <div style={{ fontSize: 13, color: GPT_T.ink70, marginTop: 2 }}>{rankLabel}</div>
                {getHomeZone() && (
                  <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 3 }}>📍 {getHomeZone()!.name} · {getHomeZone()!.region}</div>
                )}
                {identity.bio && (
                  <div style={{ fontSize: 13, color: GPT_T.ink70, marginTop: 5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{identity.bio}</div>
                )}
              </div>
              <button
                onClick={() => setEditing((e) => !e)}
                style={{
                  border: `1.5px solid ${GPT_T.line}`,
                  background: editing ? GPT_T.wash : GPT_T.paper,
                  color: GPT_T.ink70,
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontFamily: GPT_FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {editing ? t.profile.done : t.profile.edit}
              </button>
            </div>

            {editing && avatarId && accountId && (
              <IdentityEditor accountId={accountId} nickname={identity.nickname} avatarId={avatarId} bio={identity.bio} />
            )}
          </>
        )}

        {/* progress / empty state */}
        {loaded && xp === 0 && (
          <p style={{ opacity: 0.78, fontSize: 14.5, lineHeight: 1.55, color: GPT_T.ink70, marginTop: 18 }}>
            {t.profile.emptyState}
          </p>
        )}

        {loaded && p && xp > 0 && (
          <div style={{ marginTop: 18 }}>
            <RankBadge label={p.rankLabel} />
            <p style={{ opacity: 0.7, margin: '4px 0 12px', fontSize: 13, color: GPT_T.ink70 }}>{t.profile.xp(p.xp)}</p>
            <XpBar xp={p.xp} toNext={p.toNext} nextLabel={nextLabel} />
            {p.streakWeeks >= 1 && (
              <p style={{ marginTop: 12, fontSize: 14, color: GPT_T.ink }}>
                {t.profile.streak(p.streakWeeks)}
              </p>
            )}
            {p.badges.includes('first_ambassador') && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                borderRadius: 999,
                background: ACCENT.amberBg + '22',
                border: `1.5px solid ${ACCENT.amber}`,
                color: ACCENT.amberDeep,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.3,
                marginTop: 12,
                marginBottom: 4,
              }}>
                ★ {t.ambassador.title}
              </div>
            )}
            {p.badges.filter((b) => b !== 'first_ambassador').length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: p.badges.includes('first_ambassador') ? 8 : 12 }}>
                {p.badges.filter((b) => b !== 'first_ambassador').map((b) => <BadgeChip key={b} k={b} />)}
              </div>
            )}
          </div>
        )}

        {/* Ambassador code claim + request — shown only when user is not yet an ambassador. */}
        {loaded && accountId && !p?.badges.includes('first_ambassador') && (
          <>
            <AmbassadorCodeClaim accountId={accountId} onActivated={() => {
              fetchProfile(accountId).then((pr) => setProfile(pr)).catch(() => {})
            }} />
            <AmbassadorRequestForm accountId={accountId} onActivated={() => {
              fetchProfile(accountId).then((pr) => setProfile(pr)).catch(() => {})
            }} />
          </>
        )}

        <MyReportsCard />

        {/* Community visibility + contact requests (opt-in neighbour discovery). */}
        <CommunityPrivacyCard />

        {/* Optional recovery password (re-access on a new phone) + logout / switch account. */}
        {accountId && <AccountSecurity accountId={accountId} />}

        <ContributorsBadge variant="profile" />
      </div>
    </div>
  )
}
