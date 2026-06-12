// AmbassadorScreen.tsx — landing for #/ambassador/:token links.
// Auto-activates on mount (user opened the link intentionally — no extra tap needed).
// States: loading → success | already | invalid.
import { useEffect, useState } from 'react'
import { getAccountId } from '@/lib/account'
import { fetchProfile } from '@/lib/api'
import { setProfile } from '@/lib/profileStore'
import { navigate } from '@/hooks/useHashRoute'
import { useT } from '@/i18n/useT'
import { LogoMark } from '@/components/Logo'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'

type Phase = 'loading' | 'success' | 'already' | 'invalid'

export function AmbassadorScreen({ token }: { token: string }) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    let live = true
    getAccountId().then(async (accountId) => {
      try {
        const res = await fetch('/api/go/ambassador/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, account_id: accountId }),
        })
        const data = await res.json()
        if (!live) return
        if (!data.ok) {
          setPhase('invalid')
        } else if (data.already) {
          setPhase('already')
        } else {
          setPhase('success')
          fetchProfile(accountId).then((p) => setProfile(p)).catch(() => {})
        }
      } catch {
        if (live) setPhase('invalid')
      }
    }).catch(() => { if (live) setPhase('invalid') })
    return () => { live = false }
  }, [token])

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: GPT_T.wash,
      fontFamily: GPT_FONT,
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <LogoMark size={52} />

      <div style={{ marginTop: 28 }}>
        {phase === 'loading' && (
          <p style={{ fontSize: 15, color: GPT_T.ink70 }}>{t.ambassador.activating}</p>
        )}

        {phase === 'success' && (
          <>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              background: ACCENT.amberBg + '22',
              border: `1.5px solid ${ACCENT.amber}`,
              color: ACCENT.amberDeep,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.3,
              marginBottom: 16,
            }}>
              ★ {t.ambassador.title}
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: GPT_T.ink, margin: '0 0 8px' }}>
              {t.ambassador.success}
            </p>
            <p style={{ fontSize: 14, color: GPT_T.ink70, margin: '0 0 4px' }}>
              {t.ambassador.subtitle}
            </p>
            <p style={{ fontSize: 14, color: '#059669', fontWeight: 700, margin: '8px 0 28px' }}>
              {t.ambassador.xpBonus}
            </p>
            <button
              onClick={() => navigate({ name: 'profile' })}
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: GPT_T.ink,
                color: GPT_T.wash,
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.ambassador.goProfile}
            </button>
          </>
        )}

        {phase === 'already' && (
          <>
            <p style={{ fontSize: 20, fontWeight: 800, color: GPT_T.ink, margin: '0 0 20px' }}>
              {t.ambassador.already}
            </p>
            <button
              onClick={() => navigate({ name: 'profile' })}
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: GPT_T.ink,
                color: GPT_T.wash,
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.ambassador.goProfile}
            </button>
          </>
        )}

        {phase === 'invalid' && (
          <>
            <p style={{ fontSize: 18, fontWeight: 800, color: GPT_T.ink, margin: '0 0 20px' }}>
              {t.ambassador.invalid}
            </p>
            <button
              onClick={() => navigate({ name: 'home' })}
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: GPT_T.ink,
                color: GPT_T.wash,
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.ambassador.goHome}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
