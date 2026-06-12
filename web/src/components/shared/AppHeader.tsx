// AppHeader.tsx — the global brand bar, present on every PRIMARY tab (Home · Map · News · Community ·
// Talk · You). Logo left; account chip (with sparkle) + LangBadge + ⓘ (contains WhatsApp + About).
// Rendered ONCE in the Shell (App.tsx); notch/Dynamic-Island safe via --go-safe-top.
import { useEffect, useState, useRef } from 'react'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'
import { LogoMark } from '@/components/Logo'
import { Avatar } from '@/components/profile/Avatar'
import { GPTIcon } from '@/components/icons'
import { useProfile } from '@/hooks/useProfile'
import { getAccountId } from '@/lib/account'
import { getIdentity, onIdentityChange } from '@/lib/identity'
import { rankFor } from '@/lib/xp'
import { useT } from '@/i18n/useT'
import { checkForUpdate } from '@/lib/appRefresh'
import { APP_VERSION } from '@/lib/constants'
import { useLang } from '@/app/langStore'
import { LANGS, type Lang } from '@/i18n'
import { openWhatsAppText } from '@/lib/whatsappShare'

const LANG_SHORT: Record<Lang, string> = { en: 'EN', fr: 'FR', ar: 'عر' }
const LANG_FLAG: Record<Lang, string> = { en: '🇬🇧', fr: '🇫🇷', ar: '🇸🇦' }
const LANG_FULL: Record<Lang, string> = { en: 'English', fr: 'Français', ar: 'العربية' }

// CSS keyframes — two sparkle stars twinkle independently around the pill chip.
const SPARKLE_STYLE = `
@keyframes go-twinkle-a {
  0%   { opacity:0.1; transform:scale(0.4) rotate(0deg); }
  40%  { opacity:1;   transform:scale(1.3) rotate(45deg); }
  60%  { opacity:1;   transform:scale(1.1) rotate(30deg); }
  100% { opacity:0.1; transform:scale(0.4) rotate(90deg); }
}
@keyframes go-twinkle-b {
  0%   { opacity:0.15; transform:scale(0.5) rotate(0deg); }
  35%  { opacity:1;    transform:scale(1.25) rotate(-40deg); }
  65%  { opacity:0.8;  transform:scale(1.0) rotate(-20deg); }
  100% { opacity:0.15; transform:scale(0.5) rotate(-80deg); }
}
`

// Inject immediately at module load — not inside useEffect — so @keyframes are available
// before the first render and the inline animation: references resolve right away.
if (typeof document !== 'undefined' && !document.getElementById('go-sparkle-css')) {
  const s = document.createElement('style')
  s.id = 'go-sparkle-css'
  s.textContent = SPARKLE_STYLE
  document.head.appendChild(s)
}

/** Language button: flag+code → mini dropdown. */
function LangBadge() {
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Language: ${LANG_FULL[lang]} — change`}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 7px', borderRadius: 7, border: `1px solid ${GPT_T.line}`,
          background: GPT_T.wash, cursor: 'pointer',
          fontFamily: GPT_FONT, fontSize: 11, fontWeight: 800, lineHeight: 1, color: GPT_T.ink,
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>{LANG_FLAG[lang]}</span>
        {LANG_SHORT[lang]}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Select language"
            style={{
              position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 999,
              background: GPT_T.paper, border: `1px solid ${GPT_T.line}`,
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              overflow: 'hidden', minWidth: 148,
            }}
          >
            {LANGS.map((l) => (
              <button
                key={l}
                role="option"
                aria-selected={l === lang}
                onClick={(e) => { e.stopPropagation(); void setLang(l); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                  padding: '10px 12px', border: 'none', cursor: 'pointer', textAlign: 'start',
                  fontFamily: GPT_FONT, fontSize: 13, fontWeight: l === lang ? 800 : 600,
                  color: l === lang ? GPT_T.ink : GPT_T.ink70,
                  background: l === lang ? GPT_T.wash : GPT_T.paper,
                }}
              >
                <span style={{ fontSize: 17, lineHeight: 1 }}>{LANG_FLAG[l]}</span>
                {LANG_FULL[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** ⓘ button — tapping opens a panel with WhatsApp share + About. */
function InfoPanel({ onAbout }: { onAbout: () => void }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.header.aboutAria}
        aria-expanded={open}
        style={{
          width: 32, height: 32, borderRadius: 12, border: 'none',
          background: 'transparent', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', padding: 0,
        }}
      >
        <GPTIcon name="info" size={24} color={GPT_T.ink45} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
            background: GPT_T.paper, border: `1px solid ${GPT_T.line}`,
            borderRadius: 13, boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
            overflow: 'hidden', minWidth: 190,
          }}>
            {/* WhatsApp share */}
            <button
              onClick={(e) => { e.stopPropagation(); openWhatsAppText(); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'start',
                fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, color: ACCENT.whatsapp,
                background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, whiteSpace: 'nowrap',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={ACCENT.whatsapp} aria-hidden>
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24-1.52 0-3.01-.41-4.3-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24zm4.52 9.83c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31s-.87.85-.87 2.07c0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
              </svg>
              {t.whatsapp.buttonText}
            </button>
            {/* Update & reload (owner 2026-06-10): manual escape hatch when someone suspects they're
                on a stale build — nudges any waiting SW to take over, then reloads. Shows the running
                version so "did it change?" is answerable at a glance. */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                checkForUpdate()
                window.setTimeout(() => window.location.reload(), 350)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'start',
                fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, color: GPT_T.ink70,
                background: GPT_T.paper, borderBottom: `1px solid ${GPT_T.line}`, whiteSpace: 'nowrap',
              }}
            >
              <GPTIcon name="refresh" size={18} color={GPT_T.ink45} />
              {t.header.refresh}
              <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: GPT_T.ink25 }}>v{APP_VERSION}</span>
            </button>
            {/* About */}
            <button
              onClick={(e) => { e.stopPropagation(); onAbout(); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'start',
                fontFamily: GPT_FONT, fontSize: 13.5, fontWeight: 700, color: GPT_T.ink70,
                background: GPT_T.paper, whiteSpace: 'nowrap',
              }}
            >
              <GPTIcon name="info" size={18} color={GPT_T.ink45} />
              {t.header.about}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// 4-point star SVG glyph used for sparkles
function StarGlyph({ size, color, style }: { size: number; color: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={color}
      aria-hidden style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
    </svg>
  )
}

/** Pill chip — avatar + nickname, with two sparkle stars, identical to the online version. */
function ProfileChip({ onProfile }: { onProfile: () => void }) {
  const p = useProfile()
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    let accountId = ''
    const refresh = () => {
      if (!live || !accountId) return
      const idn = getIdentity(accountId)
      setAvatarId(idn.avatarId)
      setNickname(idn.nickname)
    }
    getAccountId().then((id) => { accountId = id; refresh() }).catch(() => {})
    const off = onIdentityChange(refresh)
    return () => { live = false; off() }
  }, [])
  const rankLabel = p && p.xp > 0 ? rankFor(p.xp).label.split(' ')[0] : 'Observer'
  const displayName = nickname?.trim() ? nickname.trim() : rankLabel
  const t = useT()
  return (
    <button
      onClick={onProfile}
      aria-label={t.header.profileChipAria(displayName)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 9px 2px 2px', borderRadius: 999,
        cursor: 'pointer', background: GPT_T.wash, border: `1px solid ${GPT_T.line}`,
        fontFamily: GPT_FONT, fontSize: 10, fontWeight: 800, color: GPT_T.ink,
        flexShrink: 0,
      }}
    >
      {/* Avatar — 22px circle, perfectly centred */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        {avatarId
          ? <Avatar avatarId={avatarId} size={22} />
          : <span style={{ width: 22, height: 22, borderRadius: '50%', background: GPT_T.line, display: 'block' }} />}
      </span>
      {/* Stars inside the pill, animated */}
      <span aria-hidden style={{ animation: 'go-twinkle-a 2.1s ease-in-out infinite', lineHeight: 0 }}>
        <StarGlyph size={7} color={ACCENT.star} />
      </span>
      {/* Capped: the chip is now absolutely centred between brand and utilities — a long nickname
          must truncate instead of colliding with its neighbours on 320px screens. */}
      <span style={{ maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
      <span aria-hidden style={{ animation: 'go-twinkle-b 2.7s ease-in-out infinite 0.9s', lineHeight: 0 }}>
        <StarGlyph size={6} color={ACCENT.star} />
      </span>
    </button>
  )
}

export function AppHeader({ onProfile, onAbout }: { onProfile: () => void; onAbout: () => void }) {
  return (
    <div
      style={{
        background: GPT_T.paper,
        borderBottom: `1px solid ${GPT_T.line}`,
        paddingTop: 'var(--go-safe-top)',
        paddingInlineStart: 16,
        paddingInlineEnd: 16,
        paddingBottom: 9,
        flexShrink: 0,
        fontFamily: GPT_FONT,
        direction: 'ltr',
      }}
    >
      {/* Owner 2026-06-10b: 3-zone row — brand left (flexShrink:0 so the spinning mark is NEVER
          squeezed/clipped by the flex row again), the account chip absolutely centred under the
          notch, utilities right. Wordmark slightly smaller; the circular mark stays prominent. */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 40 }}>
        {/* Brand lockup, hand-rolled (owner 2026-06-10c): the shared Logo's single-line wordmark
            wrapped on phone widths and "OUTAGE" vanished under the strip. Two stacked 12px lines
            beside the spinning mark can NEVER wrap or clip, at any width. */}
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ display: 'inline-flex', lineHeight: 0, animation: 'goLogoSpin 9s linear infinite' }}>
            <LogoMark size={36} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.04 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink, letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Gambia</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: GPT_T.ink45, letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Outage</span>
          </span>
        </span>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <ProfileChip onProfile={onProfile} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <LangBadge />
          <InfoPanel onAbout={onAbout} />
        </div>
      </div>
    </div>
  )
}
