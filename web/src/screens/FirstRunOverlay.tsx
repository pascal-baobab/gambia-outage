// FirstRunOverlay.tsx — one-time intro. Step 1: location permission. Step 2 (optional): introduce
// yourself to the community — a device-local pseudonym (avatar + nickname + free-text bio). The bio
// is PUBLISHED to the server only if the user writes one (persistent-pseudonym model); skipping
// keeps everything device-local. Never linked to reports. Deviation from prototype: the decorative
// map background is omitted (Phase 2); the FlagBg wash is kept.
// Language is chosen on the SplashScreen (before entering), not here.
import { useEffect, useState, type CSSProperties } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { FlagBg, FlagRule } from '@/components/Flag'
import { StormBackdrop } from '@/components/shared/StormBackdrop'
import { Logo } from '@/components/Logo'
import { LogoMark } from '@/components/Logo'
import { Avatar } from '@/components/profile/Avatar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { getAccountId, hasEstablishedAccount } from '@/lib/account'
import { getIdentity, setNickname, setBio } from '@/lib/identity'
import { saveIntro } from '@/lib/api'
import { navigate } from '@/hooks/useHashRoute'
import { useT } from '@/i18n/useT'

export function FirstRunOverlay({ onAllow, onSkip, onRecover }: { onAllow: () => void; onSkip: () => void; onRecover?: () => void }) {
  const t = useT()
  const [step, setStep] = useState<'loc' | 'intro'>('loc')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [avatarId, setAvatarId] = useState<string>('')
  const [nick, setNick] = useState('')
  const [bio, setBioDraft] = useState('')
  // Returning device (established account) → offer a one-tap jump straight to the account, no re-onboarding.
  const [established] = useState(hasEstablishedAccount)

  function enterAccount() {
    navigate({ name: 'profile' })
    onSkip()
  }

  useEffect(() => {
    getAccountId().then((id) => {
      setAccountId(id)
      const idn = getIdentity(id)
      setAvatarId(idn.avatarId)
      setNick(idn.nickname ?? '')
      setBioDraft(idn.bio ?? '')
    }).catch(() => {})
  }, [])

  function join() {
    // persist locally, then publish best-effort (only meaningful if a bio/nickname exists)
    setNickname(nick)
    setBio(bio)
    if (accountId && (bio.trim() || nick.trim())) {
      saveIntro({ account_id: accountId, nickname: nick.trim(), avatar_id: avatarId, bio: bio.trim() }).catch(() => {})
    }
    onAllow()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, fontFamily: GPT_FONT, background: GPT_T.panel, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes go-spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <FlagBg opacity={0.2} scrim="linear-gradient(180deg, rgba(15,23,34,0.72), rgba(15,23,34,0.93))" />
      {/* Ambient looping lightning + thunder (B&W with amber splashes) behind the dark hero area */}
      <StormBackdrop />
      {/* Returning user button — floats top-right, absolute, no competition with hero content */}
      {established && avatarId && (
        <button
          onClick={enterAccount}
          aria-label={t.firstRun.goToAccount}
          style={{
            position: 'absolute', top: 'calc(var(--go-safe-top) + 10px)', right: 16, zIndex: 10,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            border: `1px solid ${GPT_T.panelLine}`, background: 'rgba(255,255,255,0.12)',
            color: '#fff', borderRadius: 999, padding: '5px 12px 5px 5px',
            fontFamily: GPT_FONT, fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
          }}
        >
          <Avatar avatarId={avatarId} size={26} />
          {t.firstRun.existingAccountBtn}
        </button>
      )}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}>
          {step === 'loc' ? (
            <>
              {/* Slow-spinning circular logo — brand anchor in the hero */}
              <div style={{ animation: 'go-spin-slow 14s linear infinite', marginBottom: 18, filter: 'drop-shadow(0 0 28px rgba(255,255,255,0.18))' }}>
                <LogoMark size={108} />
              </div>
              {/* Brand tagline rule — same lockup vocabulary as the splash, carries the brand into the welcome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <FlagRule height={4} radius={1} style={{ width: 26 }} />
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 2.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>{t.splash.tagline}</span>
                <FlagRule height={4} radius={1} style={{ width: 26 }} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.12 }}>
                {t.firstRun.locationTitle}
              </div>
              <div style={{ fontSize: 15.5, color: GPT_T.panelInk, fontWeight: 500, lineHeight: 1.5, marginTop: 14, maxWidth: 320 }}>
                {t.firstRun.locationDescription}
              </div>
              {/* Language switcher — pick your language before entering */}
              <div style={{ marginTop: 24 }}>
                <LanguageSwitcher />
              </div>
            </>
          ) : (
            <>
              {avatarId && <Avatar avatarId={avatarId} size={72} />}
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.14, marginTop: 16 }}>
                {t.intro.title}
              </div>
              <div style={{ fontSize: 14, color: GPT_T.panelInk60, fontWeight: 500, lineHeight: 1.5, marginTop: 10, maxWidth: 320 }}>
                {t.intro.blurb}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          background: GPT_T.paper,
          color: GPT_T.ink,
          borderRadius: '24px 24px 0 0',
          padding: '22px 22px calc(22px + env(safe-area-inset-bottom))',
          textAlign: 'center',
          boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
        }}
      >
        {/* M3-D: step indicator — the overlay is a 2-step flow but nothing told the user that;
            two dots orient without adding copy. */}
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: step === 'loc' ? GPT_T.ink : GPT_T.line }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: step === 'intro' ? GPT_T.ink : GPT_T.line }} />
        </div>
        {step === 'loc' ? (
          <>
            {/* Logo in the bottom panel — brand anchor above the CTA */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Logo size={14} variant="full" markScale={1.15} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink }}>{t.firstRun.useLocationQuestion}</div>
            <div style={{ fontSize: 14.5, color: GPT_T.ink70, fontWeight: 500, lineHeight: 1.5, marginTop: 7, maxWidth: 320, marginInline: 'auto' }}>
              {t.firstRun.useLocationExplanation}
            </div>
            <button
              onClick={() => setStep('intro')}
              style={primaryBtn}
            >
              {t.firstRun.allowLocation}
            </button>
            <button onClick={() => setStep('intro')} style={ghostBtn}>
              {t.firstRun.skipPickArea}
            </button>
            {onRecover && (
              /* Promoted from a faint ghost link to a real secondary button — the lost-phone path must
                 be findable in the first 5 seconds, not discovered by accident. */
              <button
                onClick={onRecover}
                style={{
                  width: '100%', minHeight: 50, borderRadius: 14, marginTop: 10, cursor: 'pointer',
                  border: `1.5px solid ${GPT_T.line}`, background: GPT_T.wash, color: GPT_T.ink70,
                  fontFamily: GPT_FONT, fontWeight: 700, fontSize: 14.5,
                }}
              >
                {t.nameGate.recoverLink} <b style={{ color: GPT_T.ink }}>{t.nameGate.recoverLinkBold}</b>
              </button>
            )}
          </>
        ) : (
          <>
            <input
              value={nick}
              maxLength={24}
              placeholder={t.intro.nick}
              onChange={(e) => setNick(e.target.value)}
              style={field}
            />
            <textarea
              value={bio}
              maxLength={160}
              rows={2}
              placeholder={t.intro.bio}
              onChange={(e) => setBioDraft(e.target.value)}
              style={{ ...field, resize: 'none', marginTop: 9, lineHeight: 1.45 }}
            />
            <button onClick={join} style={primaryBtn}>
              {bio.trim() || nick.trim() ? t.intro.join : t.intro.continue}
            </button>
            <button onClick={onSkip} style={ghostBtn}>
              {t.intro.skip}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const primaryBtn: CSSProperties = {
  width: '100%', minHeight: 56, borderRadius: 16, border: 'none', background: GPT_T.ink, color: '#fff',
  fontFamily: GPT_FONT, fontWeight: 800, fontSize: 16.5, marginTop: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
}
const ghostBtn: CSSProperties = {
  width: '100%', minHeight: 50, borderRadius: 14, border: 'none', background: 'transparent',
  color: GPT_T.ink70, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 15, marginTop: 6, cursor: 'pointer',
}
const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: `1.5px solid ${GPT_T.line}`, borderRadius: 11,
  padding: '12px 13px', fontFamily: GPT_FONT, fontSize: 15, color: GPT_T.ink, background: GPT_T.wash, outline: 'none',
}
