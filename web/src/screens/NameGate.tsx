// NameGate.tsx — forced, globally-unique public name. Shown once (after first-run/splash) to any device
// that hasn't claimed a name yet; it BLOCKS until a valid, available name is claimed. Uniqueness is
// case-insensitive and checked live against the server registry while typing. The name can later be
// changed once every 60 days (handled in Profile). Anonymous: a pseudonym only, never linked to reports.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useTheme } from '@/app/theme'
import { useT } from '@/i18n/useT'
import { FlagBg } from '@/components/Flag'
import { Logo } from '@/components/Logo'
import { GPTIcon } from '@/components/icons'
import { Avatar } from '@/components/profile/Avatar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { getAccountId, adoptAccount } from '@/lib/account'
import { getIdentity, setNickname } from '@/lib/identity'
import { checkName, claimName, recoverAccount } from '@/lib/api'
import { markNameClaimed } from '@/lib/username'

type Status = 'idle' | 'short' | 'checking' | 'ok' | 'taken' | 'reserved' | 'invalid' | 'error'

export function NameGate({ onDone, onSkip, initialMode = 'create' }: { onDone: () => void; onSkip?: () => void; initialMode?: 'create' | 'recover' }) {
  const th = useTheme()
  const t = useT()
  const HINT: Record<Status, string> = {
    idle: t.nameGate.hintIdle,
    short: t.nameGate.hintShort,
    checking: t.nameGate.hintChecking,
    ok: t.nameGate.hintOk,
    taken: t.nameGate.hintTaken,
    reserved: t.nameGate.hintReserved,
    invalid: t.nameGate.hintInvalid,
    error: t.nameGate.hintError,
  }
  const [accountId, setAccountId] = useState<string | null>(null)
  const [avatarId, setAvatarId] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [takenHasPassword, setTakenHasPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const seq = useRef(0) // guards against out-of-order availability responses

  // Recover an existing account (other phone) by name + password → adopt the capability + reload.
  const [mode, setMode] = useState<'create' | 'recover'>(initialMode)
  const [rName, setRName] = useState('')
  const [rPass, setRPass] = useState('')
  const [showRPass, setShowRPass] = useState(false)
  const [rBusy, setRBusy] = useState(false)
  const [rErr, setRErr] = useState('')
  async function recover() {
    if (rBusy || !rName.trim() || rPass.length < 6) return
    setRBusy(true)
    setRErr('')
    try {
      const res = await recoverAccount(rName.trim(), rPass)
      if (res.ok && res.account_id) {
        adoptAccount({ account_id: res.account_id, name: res.name, avatarId: res.avatarId, bio: res.bio, nextChangeAt: res.nextChangeAt })
        window.location.reload()
        return
      }
      setRErr(res.reason === 'locked' ? t.nameGate.recoverLockedError : t.nameGate.recoverInvalidError)
    } catch {
      setRErr(t.nameGate.recoverNetworkError)
    } finally {
      setRBusy(false)
    }
  }

  useEffect(() => {
    getAccountId().then((id) => {
      setAccountId(id)
      setAvatarId(getIdentity(id).avatarId)
    }).catch(() => {})
  }, [])

  // Debounced live availability check.
  useEffect(() => {
    const n = name.trim()
    if (n.length === 0) { setStatus('idle'); return }
    if (n.length < 3) { setStatus('short'); return }
    setStatus('checking')
    const my = ++seq.current
    const t = window.setTimeout(() => {
      checkName(n, accountId || undefined)
        .then((r) => {
          if (my !== seq.current) return // a newer keystroke superseded this one
          if (r.available) { setStatus('ok'); setTakenHasPassword(false) }
          else {
            setStatus((r.reason as Status) || 'taken')
            setTakenHasPassword(r.reason === 'taken' && !!r.hasPassword)
          }
        })
        .catch(() => { if (my === seq.current) setStatus('error') })
    }, 400)
    return () => window.clearTimeout(t)
  }, [name, accountId])

  const canSubmit = !!accountId && !submitting && (status === 'ok' || status === 'error') && name.trim().length >= 3

  async function claim() {
    if (!accountId || name.trim().length < 3) return
    setSubmitting(true)
    try {
      const res = await claimName(accountId, name.trim())
      if (res.ok && res.name) {
        setNickname(res.name)
        markNameClaimed(res.name, res.nextChangeAt)
        onDone()
        return
      }
      setStatus((res.reason as Status) || 'taken')
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColor = status === 'ok' ? th.on : status === 'checking' || status === 'idle' || status === 'short' ? GPT_T.ink45 : th.out

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 96, fontFamily: GPT_FONT, background: GPT_T.panel, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.72), rgba(15,23,34,0.93))" />
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 'calc(var(--go-safe-top) + 10px)', paddingBottom: 10, paddingInlineStart: 16, paddingInlineEnd: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={18} mono variant="full" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}>
          {avatarId && <Avatar avatarId={avatarId} size={72} />}
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.14, marginTop: 16 }}>
            {t.nameGate.title}
          </div>
          <div style={{ fontSize: 14, color: GPT_T.panelInk60, fontWeight: 500, lineHeight: 1.5, marginTop: 10, maxWidth: 320 }}>
            {t.nameGate.description}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', background: GPT_T.paper, color: GPT_T.ink, borderRadius: '24px 24px 0 0', padding: '22px 22px calc(22px + env(safe-area-inset-bottom))', boxShadow: '0 -20px 50px rgba(0,0,0,0.45)', overflowY: 'auto', maxHeight: '70vh' }}>
        {mode === 'create' ? (
          <>
            <div style={{ position: 'relative' }}>
              <input
                value={name}
                maxLength={20}
                autoFocus
                placeholder={t.nameGate.namePlaceholder}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) claim() }}
                style={{ ...field, paddingInlineEnd: 42, borderColor: status === 'ok' ? th.on : status === 'taken' || status === 'reserved' || status === 'invalid' ? th.out : GPT_T.line }}
              />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', lineHeight: 0 }}>
                {status === 'ok' && <GPTIcon name="check" size={18} color={th.on} />}
                {(status === 'taken' || status === 'reserved' || status === 'invalid') && <GPTIcon name="close" size={16} color={th.out} />}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: statusColor, marginTop: 8, minHeight: 17, textAlign: 'start' }}>
              {status === 'taken' && takenHasPassword ? (
                <span>
                  {t.nameGate.hintTakenWithPassword}{' '}
                  <button
                    onClick={() => { setRName(name.trim()); setMode('recover'); setRErr('') }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 800, color: th.on, textDecoration: 'underline' }}
                  >
                    {t.nameGate.hintTakenRecover}
                  </button>
                </span>
              ) : HINT[status]}
            </div>
            <button onClick={claim} disabled={!canSubmit} style={{ ...primaryBtn, background: canSubmit ? GPT_T.ink : GPT_T.line, color: canSubmit ? '#fff' : GPT_T.ink45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
              {submitting ? t.nameGate.claiming : t.nameGate.continueBtn}
            </button>
            {/* Skip is the prominent secondary for a FIRST user — claiming a name must NEVER stand
                between them and reporting the current outage. A clear, full-width ghost button (not a
                tiny muted link) right under the primary, so it's found in the first glance. */}
            {onSkip && (
              <button onClick={onSkip} style={{ width: '100%', minHeight: 50, marginTop: 10, borderRadius: 14, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.wash, cursor: 'pointer', fontFamily: GPT_FONT, fontSize: 15, fontWeight: 800, color: GPT_T.ink, textAlign: 'center' }}>
                {t.nameGate.skipBtn}
              </button>
            )}
            {/* Recover is tertiary here (it's already prominent on the splash + welcome) — a plain link. */}
            <button onClick={() => { setMode('recover'); setRErr('') }}
              style={{ ...linkBtn, marginTop: 12, fontSize: 13, color: GPT_T.ink45, textAlign: 'center' }}>
              {t.nameGate.recoverLink} <b style={{ color: GPT_T.ink70 }}>{t.nameGate.recoverLinkBold}</b>
            </button>
            <div style={{ fontSize: 11.5, color: GPT_T.ink45, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}>
              <GPTIcon name="lock" size={13} color={GPT_T.ink45} /> {t.nameGate.privacyDisclaimer}
            </div>
            <div style={{ marginTop: 18, borderTop: `1px solid ${GPT_T.line}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: GPT_T.ink45, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Language · Langue · اللغة</div>
              <LanguageSwitcher />
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink }}>{t.nameGate.recoverTitle}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 4, marginBottom: 12, textAlign: 'start' }}>
              {t.nameGate.recoverInstruction}
            </div>
            <input value={rName} maxLength={20} autoFocus placeholder={t.nameGate.recoverNamePlaceholder} onChange={(e) => setRName(e.target.value)} style={field} />
            <div style={{ position: 'relative', marginTop: 10 }}>
              <input value={rPass} type={showRPass ? 'text' : 'password'} placeholder={t.nameGate.recoverPassPlaceholder} onChange={(e) => setRPass(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') recover() }} style={{ ...field, paddingInlineEnd: 46 }} />
              <button onClick={() => setShowRPass((v) => !v)} type="button"
                style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: GPT_T.ink45, padding: 2, lineHeight: 0 }}>
                <EyeToggle visible={showRPass} />
              </button>
            </div>
            {rErr && <div style={{ fontSize: 12.5, fontWeight: 700, color: th.out, marginTop: 8, textAlign: 'start' }}>{rErr}</div>}
            <button onClick={recover} disabled={rBusy || !rName.trim() || rPass.length < 6}
              style={{ ...primaryBtn, background: !rBusy && rName.trim() && rPass.length >= 6 ? GPT_T.ink : GPT_T.line, color: !rBusy && rName.trim() && rPass.length >= 6 ? '#fff' : GPT_T.ink45, cursor: !rBusy && rName.trim() && rPass.length >= 6 ? 'pointer' : 'not-allowed' }}>
              {rBusy ? t.nameGate.recovering : t.nameGate.recoverBtn}
            </button>
            <button onClick={() => setMode('create')} style={linkBtn}>{t.nameGate.createNewLink}</button>
          </>
        )}
      </div>
    </div>
  )
}

function EyeToggle({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1={1} y1={1} x2={23} y2={23}/>
    </svg>
  )
}

const primaryBtn: CSSProperties = {
  width: '100%', minHeight: 56, borderRadius: 16, border: 'none',
  fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16.5, marginTop: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
}
const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 12,
  padding: '13px 14px', fontFamily: GPT_FONT, fontSize: 16, fontWeight: 700, color: GPT_T.ink, background: GPT_T.wash, outline: 'none',
}
const linkBtn: CSSProperties = {
  width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 600, color: GPT_T.ink45,
}
