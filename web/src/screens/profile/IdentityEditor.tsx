// IdentityEditor — inline identity editor (extracted from ProfileScreen.tsx, behavior unchanged):
// nickname + free-text bio + avatar picker grid. Persists immediately to localStorage
// (lib/identity); ProfileScreen re-renders via onIdentityChange. The persistent pseudonym
// (nickname/avatar/bio) is PUBLISHED to the community via saveIntro on edit — but it is
// NEVER linked to your anonymous reports.
import { useEffect, useRef, useState } from 'react'
import { saveIntro, checkName, claimName } from '@/lib/api'
import { useT } from '@/i18n/useT'
import { canChangeName, daysUntilNameChange, markNameClaimed } from '@/lib/username'
import { setNickname, setAvatar, setBio } from '@/lib/identity'
import { HomeZonePicker } from '@/components/profile/HomeZonePicker'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { AVATARS } from '@/lib/avatars.generated'
import { Avatar } from '@/components/profile/Avatar'
import { GPT_T, GPT_FONT, FLAG } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { GPTIcon } from '@/components/icons'

// Unique public name with a 60-day change cooldown. Shows the current name; "Change" opens an inline
// editor with live availability (case-insensitive uniqueness) → claimName. Locked during the cooldown.
function NameRow({ accountId, name }: { accountId: string; name: string }) {
  const th = useTheme()
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [status, setStatus] = useState<'idle' | 'short' | 'checking' | 'ok' | 'taken' | 'reserved' | 'invalid' | 'error'>('idle')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const seq = useRef(0)
  const allowed = canChangeName()
  const waitDays = daysUntilNameChange()

  useEffect(() => {
    if (!editing) return
    const n = draft.trim()
    if (n.toLowerCase() === name.toLowerCase()) { setStatus('idle'); return }
    if (n.length < 3) { setStatus('short'); return }
    setStatus('checking')
    const my = ++seq.current
    const t = window.setTimeout(() => {
      checkName(n, accountId).then((r) => {
        if (my !== seq.current) return
        setStatus(r.available ? 'ok' : ((r.reason as typeof status) || 'taken'))
      }).catch(() => { if (my === seq.current) setStatus('error') })
    }, 400)
    return () => window.clearTimeout(t)
  }, [draft, editing, name, accountId])

  async function save() {
    const n = draft.trim()
    if (n.length < 3 || n.toLowerCase() === name.toLowerCase()) { setEditing(false); return }
    setSaving(true); setMsg('')
    try {
      const res = await claimName(accountId, n)
      if (res.ok && res.name) {
        setNickname(res.name); markNameClaimed(res.name, res.nextChangeAt)
        setEditing(false)
      } else if (res.reason === 'cooldown' && res.until) {
        const d = Math.max(0, Math.ceil((new Date(res.until).getTime() - Date.now()) / 86400000))
        setMsg(t.profile.nameCooldown(d))
      } else {
        setMsg(res.reason === 'taken' ? t.profile.nameTaken : res.reason === 'reserved' ? t.profile.nameReserved : t.profile.nameInvalid)
      }
    } catch { setMsg(t.profile.saveError) } finally { setSaving(false) }
  }

  const okToSave = !saving && status === 'ok' && draft.trim().length >= 3
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, marginBottom: 7 }}>{t.profile.nameLabel}</label>
      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: GPT_T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || '—'}</span>
          <button
            onClick={() => { if (allowed) { setDraft(name); setStatus('idle'); setMsg(''); setEditing(true) } }}
            disabled={!allowed}
            style={{ flexShrink: 0, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: allowed ? GPT_T.ink : GPT_T.ink45, borderRadius: 9, padding: '7px 12px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13, cursor: allowed ? 'pointer' : 'not-allowed' }}
          >
            {allowed ? t.profile.changeBtn : t.profile.changeLocked(waitDays)}
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <input
              value={draft}
              maxLength={20}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && okToSave) save() }}
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${status === 'ok' ? th.on : status === 'taken' || status === 'reserved' || status === 'invalid' ? th.out : GPT_T.line}`, borderRadius: 9, padding: '9px 38px 9px 11px', fontFamily: GPT_FONT, fontSize: 15, fontWeight: 700, color: GPT_T.ink, background: GPT_T.wash, outline: 'none' }}
            />
            <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', lineHeight: 0 }}>
              {status === 'ok' && <GPTIcon name="check" size={16} color={th.on} />}
              {(status === 'taken' || status === 'reserved' || status === 'invalid') && <GPTIcon name="close" size={15} color={th.out} />}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <button onClick={save} disabled={!okToSave} style={{ flex: 1, border: 'none', background: okToSave ? GPT_T.ink : GPT_T.line, color: okToSave ? '#fff' : GPT_T.ink45, borderRadius: 9, padding: '9px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: okToSave ? 'pointer' : 'not-allowed' }}>{saving ? t.profile.saving : t.profile.saveBtn}</button>
            <button onClick={() => { setEditing(false); setMsg('') }} style={{ border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, borderRadius: 9, padding: '9px 14px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{t.profile.cancelBtn}</button>
          </div>
        </>
      )}
      {msg && <div style={{ fontSize: 12, fontWeight: 700, color: th.out, marginTop: 7 }}>{msg}</div>}
      {!editing && (
        <div style={{ fontSize: 11.5, color: GPT_T.ink45, marginTop: 6, fontWeight: 600 }}>
          {t.profile.nameInfo}
        </div>
      )}
    </div>
  )
}

function AvatarPreview({ id, onSelect, onClose }: { id: string; onSelect: () => void; onClose: () => void }) {
  const t = useT()
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(15,23,34,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: GPT_T.paper, borderRadius: 24, padding: '28px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, boxShadow: '0 20px 60px rgba(15,23,34,0.35)', minWidth: 220 }}
      >
        <Avatar avatarId={id} size={160} />
        <button
          onClick={onSelect}
          style={{ width: '100%', border: 'none', background: FLAG.blue, color: '#fff', borderRadius: 12, padding: '13px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: 0.2 }}
        >
          {t.identity.selectAvatar}
        </button>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', padding: '4px 0' }}
        >
          {t.profile.cancelBtn}
        </button>
      </div>
    </div>
  )
}

export function IdentityEditor({ accountId, nickname, avatarId, bio }: { accountId: string; nickname: string | null; avatarId: string; bio: string }) {
  const t = useT()
  const [bioDraft, setBioDraft] = useState(bio ?? '')
  const [previewId, setPreviewId] = useState<string | null>(null)

  // Name is NEVER changed via saveIntro (that would bypass the unique registry + cooldown) — only the
  // dedicated NameRow → claimName does. So publish always re-sends the current claimed name unchanged.
  function publish(next: { avatarId?: string; bio?: string }) {
    saveIntro({
      account_id: accountId,
      nickname: (nickname ?? '').trim(),
      avatar_id: next.avatarId ?? avatarId,
      bio: (next.bio ?? bioDraft).trim(),
    }).catch(() => { /* best-effort; local copy already saved */ })
  }

  return (
    <div style={{ marginTop: 14, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: 14 }}>
      {previewId && (
        <AvatarPreview
          id={previewId}
          onSelect={() => { setAvatar(previewId); publish({ avatarId: previewId }); setPreviewId(null) }}
          onClose={() => setPreviewId(null)}
        />
      )}
      <NameRow accountId={accountId} name={nickname ?? ''} />

      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, margin: '16px 0 7px' }}>
        {t.intro.aboutYou}
      </label>
      <textarea
        value={bioDraft}
        maxLength={160}
        rows={2}
        placeholder={t.intro.bio}
        onChange={(e) => setBioDraft(e.target.value)}
        onBlur={() => { setBio(bioDraft); publish({ bio: bioDraft }) }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: `1.5px solid ${GPT_T.line}`,
          borderRadius: 9,
          padding: '9px 11px',
          fontFamily: GPT_FONT,
          fontSize: 14.5,
          color: GPT_T.ink,
          background: GPT_T.wash,
          outline: 'none',
          resize: 'none',
          lineHeight: 1.45,
        }}
      />

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: GPT_T.ink70, margin: '16px 0 9px' }}>
        {t.profile.avatar}
      </div>
      {/* Avatar picker — New / Classic sectioned grid (Phase 02 avatar refresh) */}
      {(() => {
        // IDs added in Phase 02 (all non-legacy IDs). Classic = the 16 original IDs.
        const NEW_IDS = new Set([
          'african-w-7', 'african-w-8', 'african-w-9', 'african-w-10', 'african-w-11', 'african-w-12',
          'african-m-7', 'african-m-8', 'african-m-9', 'african-m-10', 'african-m-11', 'african-m-12',
          'arab-w-1', 'arab-m-1', 'arab-w-2', 'arab-m-2',
          'indian-w-2', 'indian-w-3', 'indian-m-2', 'indian-m-3',
          'caucasian-w-2', 'caucasian-w-3', 'caucasian-m-2', 'caucasian-m-3',
        ])
        const newAvatars = AVATARS.filter((a) => NEW_IDS.has(a.id))
        const classicAvatars = AVATARS.filter((a) => !NEW_IDS.has(a.id))

        function avatarButton(a: typeof AVATARS[number]) {
          const selected = a.id === avatarId
          return (
            <button
              key={a.id}
              onClick={() => setPreviewId(a.id)}
              aria-pressed={selected}
              aria-label={t.identity.chooseAvatar}
              style={{
                padding: 4,
                borderRadius: '50%',
                border: `2.5px solid ${selected ? FLAG.blue : 'transparent'}`,
                background: GPT_T.paper,
                cursor: 'pointer',
                lineHeight: 0,
                justifySelf: 'center',
              }}
            >
              <Avatar avatarId={a.id} size={44} />
            </button>
          )
        }

        return (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, margin: '16px 0 8px' }}>
              {t.identity.sections.new}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 8 }}>
              {newAvatars.map(avatarButton)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: GPT_T.ink45, margin: '16px 0 8px' }}>
              {t.identity.sections.classic}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 8 }}>
              {classicAvatars.map(avatarButton)}
            </div>
          </>
        )
      })()}

      <div style={{ marginTop: 16 }}>
        <HomeZonePicker />
      </div>

        <div style={{ padding: '16px 18px', borderTop: `1px solid ${GPT_T.line}` }}>
          <div style={{ fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 800, color: GPT_T.ink45, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.profile.languageLabel}</div>
          <LanguageSwitcher />
        </div>

      <p style={{ fontSize: 12, color: GPT_T.ink70, lineHeight: 1.5, margin: '13px 0 0' }}>
        {t.intro.pseudonymNote}
      </p>
    </div>
  )
}
