// AccountSecurity.tsx — optional, PII-free account recovery controls on the Profile.
//   • Set/replace a recovery password (so the account can be re-accessed on a new phone via name + password).
//   • Log out / switch account (a device can hold several accounts over time).
// No phone, no email. The password protects the unique-name → account_id mapping; never linked to reports.
import { useEffect, useState } from 'react'
import { GPT_T, GPT_FONT, THEMES } from '@/lib/tokens'
import { accountStatus, setAccountPassword } from '@/lib/api'
import { logoutAccount } from '@/lib/account'
import { useT } from '@/i18n/useT'

const ON = THEMES.standard.on
const OUT = THEMES.standard.out

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1={1} y1={1} x2={23} y2={23}/>
    </svg>
  )
}

export function AccountSecurity({ accountId }: { accountId: string }) {
  const t = useT()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let live = true
    accountStatus(accountId).then((s) => { if (live) setHasPassword(s.hasPassword) }).catch(() => { if (live) setHasPassword(false) })
    return () => { live = false }
  }, [accountId])

  async function save() {
    if (busy || pw.length < 6) return
    setBusy(true)
    setMsg('')
    try {
      const res = await setAccountPassword(accountId, pw)
      if (res.ok) {
        setHasPassword(true)
        setOpen(false)
        setPw('')
        setMsg(t.accountSecurity.saveSuccess)
      } else {
        setMsg(res.reason === 'no_name' ? t.accountSecurity.errorNoName : t.accountSecurity.errorInvalidPassword)
      }
    } catch {
      setMsg(t.accountSecurity.errorGeneric)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    const warn = hasPassword
      ? t.accountSecurity.logoutConfirmWithPassword
      : t.accountSecurity.logoutConfirmNoPassword
    if (typeof window !== 'undefined' && !window.confirm(warn)) return
    logoutAccount()
    window.location.reload()
  }

  return (
    <div style={{ marginTop: 18, background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 12, padding: 14, fontFamily: GPT_FONT }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: GPT_T.ink45, textTransform: 'uppercase' }}>{t.accountSecurity.sectionTitle}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink }}>{t.accountSecurity.passwordTitle}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: hasPassword ? ON : GPT_T.ink45, marginTop: 2 }}>
            {hasPassword === null ? t.accountSecurity.loading : hasPassword ? t.accountSecurity.passwordSetDescription : t.accountSecurity.passwordUnsetDescription}
          </div>
        </div>
        <button onClick={() => { setOpen((v) => !v); setMsg('') }}
          style={{ height: 34, padding: '0 14px', borderRadius: 9, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: GPT_FONT, flexShrink: 0 }}>
          {hasPassword ? t.accountSecurity.changeBtn : t.accountSecurity.setBtn}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ position: 'relative' }}>
            <input value={pw} type={showPw ? 'text' : 'password'} placeholder={t.accountSecurity.passwordPlaceholder} autoFocus onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 10, padding: '11px 42px 11px 12px', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink, background: GPT_T.wash, outline: 'none' }} />
            <button onClick={() => setShowPw((v) => !v)} type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: GPT_T.ink45, padding: 2, lineHeight: 0 }}>
              <EyeIcon visible={showPw} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <button onClick={() => { setOpen(false); setPw('') }} style={{ flex: 1, height: 38, borderRadius: 9, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: GPT_FONT }}>{t.accountSecurity.cancelBtn}</button>
            <button onClick={save} disabled={busy || pw.length < 6} style={{ flex: 1.4, height: 38, borderRadius: 9, border: 0, background: !busy && pw.length >= 6 ? GPT_T.ink : GPT_T.line, color: !busy && pw.length >= 6 ? '#fff' : GPT_T.ink45, fontWeight: 800, fontSize: 13, cursor: !busy && pw.length >= 6 ? 'pointer' : 'default', fontFamily: GPT_FONT }}>{busy ? t.accountSecurity.savingBtn : t.accountSecurity.saveBtn}</button>
          </div>
        </div>
      )}
      {msg && <div style={{ fontSize: 12, fontWeight: 700, color: msg.includes('✓') ? ON : OUT, marginTop: 8 }}>{msg}</div>}

      <button onClick={logout} style={{ width: '100%', marginTop: 14, height: 40, borderRadius: 10, border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: OUT, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: GPT_FONT }}>
        {t.accountSecurity.logoutBtn}
      </button>
    </div>
  )
}
