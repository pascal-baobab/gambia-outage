// AdminBar.tsx — superadmin (owner) entry + indicator for the public app. Mounted once in the shell.
//   • Hidden login: navigate to #/su → a sheet asks for the PocketBase superuser email + password
//     (the SAME credential that gates /admin and /_/). On success the device enters admin mode.
//   • Admin chip: while in admin mode, a small fixed badge shows "ADMIN" + "Esci" (logout), plus a
//     one-line hint that you long-press any comment/post/link to delete it.
// No new secret, no PII; the token only unlocks the superuser-gated /api/go/admin/* calls.
import { useEffect, useState } from 'react'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { useIsAdmin, adminLogin, adminLogout, SU_SLUG_HASH, sha256Hex } from '@/lib/admin'

export function AdminBar() {
  const route = useHashRoute()
  const admin = useIsAdmin()
  // The login form only appears at #/su/<slug> when sha256(slug) matches the embedded hash — knowing
  // email+password is not enough without the secret URL.
  const [unlocked, setUnlocked] = useState(false)
  const slug = route.name === 'su' ? route.slug : undefined
  useEffect(() => {
    let live = true
    if (!slug || !SU_SLUG_HASH) {
      setUnlocked(false)
      return
    }
    sha256Hex(slug).then((h) => {
      if (live) setUnlocked(h === SU_SLUG_HASH)
    })
    return () => {
      live = false
    }
  }, [slug])

  return (
    <>
      {route.name === 'su' && unlocked && !admin && <LoginSheet />}
      {admin && <AdminChip />}
    </>
  )
}

function LoginSheet() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await adminLogin(email.trim(), pass)
      navigate({ name: 'home' })
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(8,12,18,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: GPT_FONT }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 340, background: GPT_T.paper, borderRadius: 18, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink }}>Superadmin login</div>
        <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>
          Superuser email & password (same as /admin). Unlocks long-press delete on content.
        </div>
        <input
          type="email"
          autoComplete="username"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={inputStyle}
        />
        {err && <div style={{ color: ACCENT.danger, fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={() => navigate({ name: 'home' })}
            style={{ flex: 1, height: 44, borderRadius: 11, border: `1px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, fontWeight: 800, fontFamily: GPT_FONT, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !email.trim() || !pass}
            style={{ flex: 1.4, height: 44, borderRadius: 11, border: 0, background: busy || !email.trim() || !pass ? GPT_T.line : GPT_T.ink, color: '#fff', fontWeight: 800, fontFamily: GPT_FONT, cursor: busy ? 'default' : 'pointer' }}
          >
            {busy ? '…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 46,
  marginTop: 10,
  padding: '0 13px',
  borderRadius: 11,
  border: `1px solid ${GPT_T.line}`,
  background: GPT_T.wash,
  fontSize: 15,
  fontFamily: GPT_FONT,
  color: GPT_T.ink,
  outline: 'none',
}

function AdminChip() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 10,
        bottom: 'calc(118px + env(safe-area-inset-bottom))',
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#11161C',
        color: '#fff',
        borderRadius: 999,
        padding: '6px 8px 6px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        fontFamily: GPT_FONT,
      }}
    >
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4 }}>🛡 ADMIN</span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9AA4AE', maxWidth: 150 }}>long-press any content to delete it</span>
      <button
        onClick={adminLogout}
        style={{ marginInlineStart: 2, height: 26, padding: '0 10px', borderRadius: 999, border: 0, background: ACCENT.danger, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: GPT_FONT }}
      >
        Sign out
      </button>
    </div>
  )
}
