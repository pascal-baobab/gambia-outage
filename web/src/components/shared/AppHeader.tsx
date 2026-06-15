// AppHeader.tsx — the global brand bar, present on every PRIMARY tab (Home · Map · News · Community ·
// Talk · You). Logo left; account chip (with sparkle) + LangBadge + BellButton (notification bell).
// Rendered ONCE in the Shell (App.tsx); notch/Dynamic-Island safe via --go-safe-top.
import { useEffect, useState, useRef } from 'react'
import { GPT_T, GPT_FONT, ACCENT } from '@/lib/tokens'
import { LogoMark } from '@/components/Logo'
import { Avatar } from '@/components/profile/Avatar'
import { useProfile } from '@/hooks/useProfile'
import { getAccountId } from '@/lib/account'
import { getIdentity, onIdentityChange } from '@/lib/identity'
import { rankFor } from '@/lib/xp'
import { useT } from '@/i18n/useT'
import { useLang } from '@/app/langStore'
import { LANGS, type Lang } from '@/i18n'
import { BellButton } from '@/components/BellButton'

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

export function AppHeader({
  onProfile,
  onBell,
  unseenCount,
}: {
  onProfile: () => void
  onBell: () => void
  unseenCount: number
}) {
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
          <BellButton unseenCount={unseenCount} onOpen={onBell} />
        </div>
      </div>
    </div>
  )
}
