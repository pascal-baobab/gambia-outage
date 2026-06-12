// AmbassadorCards — ambassador code claim + request blocks (extracted from ProfileScreen.tsx,
// behavior unchanged). Shown only while the user is not yet an ambassador; onActivated lets the
// screen refresh the profile so the badge appears.
import { useEffect, useState } from 'react'
import { useT } from '@/i18n/useT'
import { GPT_T, GPT_FONT } from '@/lib/tokens'

export function AmbassadorCodeClaim({ accountId, onActivated }: { accountId: string; onActivated: () => void }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')

  const activate = async () => {
    const token = code.trim()
    if (!token) return
    setStatus('loading')
    try {
      const res = await fetch('/api/go/ambassador/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, account_id: accountId }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('ok')
        onActivated()
      } else {
        setStatus('err')
      }
    } catch {
      setStatus('err')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 16, display: 'block', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', fontSize: 13, color: GPT_T.ink70,
          fontFamily: GPT_FONT, textDecoration: 'underline',
        }}
      >
        Have an ambassador code?
      </button>
    )
  }

  return (
    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: GPT_T.wash, border: `1px solid ${GPT_T.line}` }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: GPT_T.ink }}>Enter ambassador code</p>
      {status === 'ok' ? (
        <p style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>★ Activated! Check your badge above.</p>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setStatus('idle') }}
            placeholder="Paste code here…"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: `1px solid ${status === 'err' ? '#ef4444' : GPT_T.line}`,
              fontSize: 13, fontFamily: GPT_FONT, color: GPT_T.ink,
              background: GPT_T.paper, marginBottom: 8,
            }}
          />
          {status === 'err' && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px' }}>Invalid or expired code.</p>}
          <button
            onClick={activate}
            disabled={status === 'loading' || !code.trim()}
            style={{
              padding: '9px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: GPT_T.ink, color: GPT_T.wash, fontSize: 13, fontWeight: 700,
              fontFamily: GPT_FONT, opacity: status === 'loading' ? 0.6 : 1,
            }}
          >
            {status === 'loading' ? 'Activating…' : 'Activate'}
          </button>
        </>
      )}
    </div>
  )
}

export function AmbassadorRequestForm({ accountId, onActivated }: { accountId: string; onActivated: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'approved' | 'rejected'>('idle')

  useEffect(() => {
    let live = true
    fetch(`/api/go/ambassador/request-status?account_id=${encodeURIComponent(accountId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return
        if (d.status === 'approved') { setStatus('approved'); onActivated() }
        else if (d.status === 'rejected') setStatus('rejected')
        else if (d.status === 'pending') setStatus('sent')
      })
      .catch(() => {})
    return () => { live = false }
  }, [accountId]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/go/ambassador/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, message: message.trim() }),
      })
      const data = await res.json()
      if (data.ok) setStatus('sent')
      else if (data.already) setStatus('sent')
      else setStatus('idle')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'approved') return null

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ marginTop: 8, display: 'block', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: GPT_T.ink70, fontFamily: GPT_FONT, textDecoration: 'underline' }}>
        {t.ambassador.requestTitle}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 12, background: GPT_T.wash, border: `1px solid ${GPT_T.line}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800, color: GPT_T.ink }}>{t.ambassador.requestTitle}</p>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600 }}>{t.ambassador.requestSub}</p>
      {status === 'sent' ? (
        <p style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>{t.ambassador.requestSent}</p>
      ) : status === 'rejected' ? (
        <p style={{ fontSize: 13, color: GPT_T.ink45, fontWeight: 600 }}>{t.ambassador.requestRejected}</p>
      ) : (
        <>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.ambassador.requestMessagePlaceholder}
            rows={3} maxLength={500}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${GPT_T.line}`, fontSize: 13, fontFamily: GPT_FONT, color: GPT_T.ink, background: GPT_T.paper, marginBottom: 8, resize: 'none', outline: 'none' }} />
          <button onClick={send} disabled={status === 'loading'}
            style={{ padding: '9px 20px', borderRadius: 999, border: 'none', cursor: status === 'loading' ? 'default' : 'pointer', background: GPT_T.ink, color: GPT_T.wash, fontSize: 13, fontWeight: 700, fontFamily: GPT_FONT, opacity: status === 'loading' ? 0.6 : 1 }}>
            {status === 'loading' ? t.ambassador.requestSending : t.ambassador.requestBtn}
          </button>
        </>
      )}
    </div>
  )
}
