// SplashScreen.tsx — branded launch animation shown on every app open/reopen.
// Ported / extended from the design prototype "Splash Explorations.html" (3 concepts). A UNIFIED
// lightning + thunder motif runs across ALL three (shared storm/flash/bolt layers), tuned per concept
// so each keeps its own character:
//   A · Ignition (2.66s) — two opening lightning strikes + a thunder beat in the dark, then an amber
//       glow blooms, the mark ignites and the screen "turns on" to paper. Gentlest storm, warm resolve.
//   B · Thunderstorm (3.4s) — the full storm: three strikes + thunder blackouts, power surges back lit,
//       the splash composes, then a final thunder beat blacks out EVERYTHING (~240ms) before it settles.
//       The most intense (the version the owner pushed in design).
//   C · Lightning Strike (2.66s) — supporting white strikes on a paper screen, then the logo's own blue
//       hero bolt strikes down in a white flash, the mark pops, and a final thunder beat darkens it.
// A concept is picked at RANDOM on each mount, so it changes every open/reopen.
// All three end on the same paper-white brand lockup (mark → GAMBIA OUTAGE → REPORT THE DARK → url).
// Once the animation settles, the functional buttons fade in (Share on WhatsApp + optional Allow
// location) so the splash keeps doubling as the reopen gate. It auto-enters the app after the animation
// completes + a short hold (tap the backdrop to skip). Tapping a BUTTON cancels the auto-timer so the
// splash holds while the user shares / grants GPS; a faint "tap to enter" hint then appears.
import { useEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'
import { LogoMark } from '@/components/Logo'
import { FlagRule } from '@/components/Flag'
import { WhatsAppButton } from '@/components/shared/WhatsAppButton'
import { Avatar } from '@/components/profile/Avatar'
import { getAccountId, hasEstablishedAccount } from '@/lib/account'
import { getIdentity } from '@/lib/identity'
import { navigate } from '@/hooks/useHashRoute'
import { isUpdateApplying } from '@/lib/appRefresh'
import { APP_VERSION, APP_VERSION_DATE } from '@/lib/constants'

type Concept = 'A' | 'B' | 'C'
const CONCEPTS: Concept[] = ['A', 'B', 'C']

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A white-blue lightning bolt (shared by the storm layer across all three concepts).
function Bolt({ cls, fill = '#dceeff' }: { cls: string; fill?: string }) {
  return (
    <svg className={`bolt ${cls}`} viewBox="0 0 40 120" aria-hidden="true">
      <polygon points="25,0 5,54 19,54 11,120 37,42 21,42" fill={fill} />
    </svg>
  )
}

// Total splash dwell and the length of the settled "lockup + Share on WhatsApp" hold at the end.
// The brand animation plays, then the composed lockup + WhatsApp button rests for HOLD_MS so it reads
// clearly before auto-entering. Tuned to: total ~4.5s, last frame (WhatsApp visible) ~3s.
const TOTAL_MS = 4500
const HOLD_MS = 3000
// Extra splash hold (on top of the normal dwell) granted ONLY while a newer build's under-splash
// reload is still mid-flight. Generous (12s) because on slow networks the new SW must precache the whole
// build before it can activate — a short window let the user fall through onto the OLD build. The wait
// is COMMUNICATED with an on-splash "Updating…" countdown (never a frozen splash); if it expires the app
// enters the current build and the update applies on the next open. Kept in sync with appRefresh ARM_WINDOW_MS.
const UPDATE_HOLD_MS = 12000

export function SplashScreen({
  onDone,
  onRecover,
  showGps = false,
  autoMs = TOTAL_MS,
}: {
  onDone: () => void
  /** Opens the account-recovery gate (name + password). Shown only when this device has no account. */
  onRecover?: () => void
  showGps?: boolean
  /** Minimum total dwell before auto-enter. The final lockup+WhatsApp frame holds for HOLD_MS. */
  autoMs?: number
}) {
  const t = useT()
  // Pick a concept once per mount → changes on every open / reopen.
  const [concept] = useState<Concept>(() => CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)])
  const [reduce] = useState(prefersReducedMotion)

  const timer = useRef<number | null>(null)
  const [revealed, setRevealed] = useState(reduce) // buttons appear once the animation settles
  const [engaged, setEngaged] = useState(false) // true once a button is tapped → show "tap to enter"
  // Remaining seconds while the splash holds for a newer build's reload (null = not holding) → countdown UI.
  const [updateHold, setUpdateHold] = useState<number | null>(null)
  // Returning users (an established account on this device) get a one-tap shortcut straight to their
  // account — no waiting out the splash, no re-onboarding. Hidden on a genuine first access.
  const [acct, setAcct] = useState<{ avatarId: string; nickname: string } | null>(null)
  useEffect(() => {
    if (!hasEstablishedAccount()) return
    getAccountId().then((id) => { const i = getIdentity(id); setAcct({ avatarId: i.avatarId, nickname: (i.nickname || '').trim() }) }).catch(() => {})
  }, [])

  function enterAccount(e: React.MouseEvent) {
    e.stopPropagation()
    navigate({ name: 'profile' })
    onDone()
  }

  useEffect(() => {
    // Fixed total dwell (default 4.5s), with the settled "lockup + Share on WhatsApp" frame holding for
    // the last HOLD_MS (3s). The brand animation (2.66–3.4s) plays in the centre while the WhatsApp
    // button waits at the bottom — different regions, so the reveal never clashes with the logo compose.
    const enterMs = Math.max(autoMs, TOTAL_MS)
    const revealMs = reduce ? 0 : Math.max(0, enterMs - HOLD_MS)
    const revealAt = window.setTimeout(() => setRevealed(true), revealMs)

    // Exploit the splash to land on the LATEST build: if a newer deployed version was detected on open
    // (lib/appRefresh), it reloads the page under this animation. So once the normal dwell is up, HOLD
    // the splash a little longer (bounded by UPDATE_HOLD_MS) while that reload is still mid-flight —
    // otherwise the user briefly enters the OLD app before the reload fires. No update → enters at enterMs.
    const deadline = enterMs + UPDATE_HOLD_MS
    let elapsed = 0
    const tick = (wait: number) => {
      timer.current = window.setTimeout(() => {
        elapsed += wait
        const reachedDwell = elapsed >= enterMs
        const holdForUpdate = isUpdateApplying() && elapsed < deadline
        // Surface the wait as a countdown (seconds left) so the held splash reads as "updating", not frozen.
        setUpdateHold(reachedDwell && holdForUpdate ? Math.max(1, Math.ceil((deadline - elapsed) / 1000)) : null)
        if (reachedDwell && !holdForUpdate) { onDone(); return }
        tick(200)
      }, wait)
    }
    tick(enterMs)

    return () => {
      window.clearTimeout(revealAt)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [onDone, autoMs, reduce])

  // A button tap must not auto-vanish the splash mid-action: cancel the timer and let the user proceed.
  function pauseAuto() {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null }
    setEngaged(true)
  }

  function allowGps(e: React.MouseEvent) {
    e.stopPropagation()
    pauseAuto()
    try {
      navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { timeout: 8000 })
    } catch {
      /* geolocation unavailable — non-blocking */
    }
  }

  // A & B wake from the dark panel; C is paper throughout. Reduced-motion always lands on paper so the
  // dark-ink lockup stays legible (the animated paper turn-on layers are skipped).
  const rootBg = reduce || concept === 'C' ? GPT_T.paper : GPT_T.panel

  return (
    <div
      onClick={onDone}
      role="img"
      aria-label={t.splash.ariaLabel}
      className={`go-splash c${concept}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 6000,
        background: rootBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: GPT_FONT,
        padding: 24,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <style>{SPLASH_CSS}</style>

      {!reduce && (
        <>
          {/* Concept-specific resolution layers */}
          {(concept === 'A' || concept === 'B') && <div className="scrbg" />}
          {concept === 'A' && <div className="glowA" />}
          {concept === 'B' && <div className="surge" />}

          {/* Shared storm layer — lightning bolts (A/C: 2 strikes, B: 3), white flash, thunder blackout */}
          <Bolt cls="bolt1" />
          <Bolt cls="bolt2" />
          {concept === 'B' && <Bolt cls="bolt3" fill="#eaf4ff" />}
          <div className="storm" />
          <div className="flashW" />

          {/* Encore storm — concept-agnostic extra strikes on the FULL 4.5s timeline: three more bolts
              (double-blink, real lightning re-strikes) densify the opening, then two distant thunder
              beats flicker through the settled lockup hold so the storm never quite dies. Own layers
              (stormX/flashX) so they stack on top of each concept's storm without fighting it. */}
          <Bolt cls="boltX boltX1" fill="#eaf4ff" />
          <Bolt cls="boltX boltX2" />
          <Bolt cls="boltX boltX3" fill="#cfe6ff" />
          <div className="stormX" />
          <div className="flashX" />
        </>
      )}

      {/* ── Shared brand stack (the settled end-state for all concepts) ─────── */}
      <div className="stack">
        {concept === 'B' && !reduce && (
          <div className="bulbDark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 2.6a6.6 6.6 0 0 0-3.9 11.9c.6.45 1 1.15 1.05 1.9l.05.7h5.5l.05-.7c.05-.75.45-1.45 1.05-1.9A6.6 6.6 0 0 0 12 2.6Z" fill="none" stroke="#3B454F" strokeWidth="1.6" />
              <rect x="9.4" y="18" width="5.2" height="1.5" rx=".6" fill="#3B454F" />
              <rect x="9.8" y="19.8" width="4.4" height="1.5" rx=".6" fill="#3B454F" />
              <path d="M10.4 21.6h3.2c-.3.85-.85 1.3-1.6 1.3s-1.3-.45-1.6-1.3Z" fill="#3B454F" />
            </svg>
          </div>
        )}

        {concept === 'C' && !reduce && (
          <div className="boltwrap" aria-hidden="true">
            <svg className="boltC" viewBox="0 0 64 120">
              <polygon points="40,2 8,66 30,66 22,118 58,46 34,46" fill="#0E50A0" />
            </svg>
          </div>
        )}

        <div className="markwrap">
          <LogoMark size={130} />
        </div>

        <div className="word">
          Gambia <span className="dim">Outage</span>
        </div>

        <div className="tag">
          <FlagRule height={4} radius={1} style={{ width: 26 }} />
          <span className="lbl">{t.splash.tagline}</span>
          <FlagRule height={4} radius={1} style={{ width: 26 }} />
        </div>

        {/* At the END of the animation (settled frame) we announce the exact build the user is now on. */}
        <div className="url">{revealed ? t.splash.updatedMessage(APP_VERSION, APP_VERSION_DATE) : `${t.splash.siteLabel} · v${APP_VERSION}`}</div>
        <div className="url" style={{ marginTop: 3, opacity: 0.62, letterSpacing: 0.5 }}>{t.splash.openSource}</div>
      </div>

      {/* ── Functional actions — fade in once the animation settles ─────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity .45s ease-out, transform .45s ease-out',
          pointerEvents: revealed ? 'auto' : 'none',
        }}
      >
        {acct && (
          <button
            onClick={enterAccount}
            aria-label={t.splash.enterAs(acct.nickname || 'you')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: GPT_T.ink, color: '#fff', borderRadius: 999, padding: '8px 16px 8px 8px', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,.3)' }}
          >
            <Avatar avatarId={acct.avatarId} size={30} />
            {t.splash.enterAs(acct.nickname || 'you')}
          </button>
        )}
        <WhatsAppButton variant="pill" onActivate={pauseAuto} />
        {/* Lost-phone path surfaced at the FRONT DOOR: a device with no established account gets the
            recover entry right on the splash, before first-run/NameGate ever ask it to create one. */}
        {!acct && onRecover && (
          <button
            onClick={(e) => { e.stopPropagation(); onRecover() }}
            style={{ border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, borderRadius: 999, padding: '9px 18px', fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
          >
            {t.nameGate.recoverLink} <b style={{ color: GPT_T.ink }}>{t.nameGate.recoverLinkBold}</b>
          </button>
        )}
        {showGps && (
          <button
            onClick={allowGps}
            style={{ border: `1.5px solid ${GPT_T.line}`, background: GPT_T.paper, color: GPT_T.ink70, borderRadius: 999, padding: '9px 18px', fontFamily: GPT_FONT, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
          >
            {t.splash.allowLocation}
          </button>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, textAlign: 'center', fontSize: 12, fontWeight: 600, color: GPT_T.ink25, opacity: engaged ? 1 : 0, transition: 'opacity .3s' }}>
        {t.splash.tapToEnter}
      </div>

      {/* Newer build is landing under the splash: communicate the (bounded) wait with a countdown so the
          held splash reads as "updating", never frozen. Paper pill = legible on both light + dark concepts. */}
      {updateHold !== null && (
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 9, pointerEvents: 'none' }}>
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '8px 15px', borderRadius: 999,
              background: GPT_T.paper, color: GPT_T.ink, border: `1px solid ${GPT_T.line}`,
              boxShadow: '0 8px 24px rgba(15,23,34,0.28)',
              fontFamily: GPT_FONT, fontSize: 12.5, fontWeight: 700,
            }}
          >
            <span className="go-upd-spin" aria-hidden="true" />
            <span>{t.splash.updating}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.6, minWidth: 13, textAlign: 'center' }}>{updateHold}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Animation CSS ──────────────────────────────────────────────────────────────
// Shared brand stack + shared storm layer (bolts/flash/thunder), then per-concept keyframes that tune
// the storm intensity and the resolution. B's storm keyframes are the design original; A & C reuse the
// same storm VOCABULARY (bolt placement, white flash, thunder blackout) at their own timing.
const SPLASH_CSS = `
  .go-splash .stack{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;}
  .go-splash .word{margin-top:24px;font-size:31px;font-weight:900;letter-spacing:-.5px;text-transform:uppercase;color:${GPT_T.ink};line-height:1;}
  .go-splash .word .dim{opacity:.55;}
  .go-splash .tag{margin-top:14px;display:flex;align-items:center;gap:10px;}
  .go-splash .tag .lbl{font-size:12.5px;font-weight:800;letter-spacing:2.6px;text-transform:uppercase;color:${GPT_T.ink45};}
  .go-splash .url{margin-top:16px;font-size:12.5px;font-weight:700;letter-spacing:.4px;color:${GPT_T.ink25};}
  .go-splash .go-upd-spin{width:14px;height:14px;border-radius:50%;border:2px solid ${GPT_T.line};border-top-color:${GPT_T.ink};display:inline-block;animation:goUpdSpin .8s linear infinite;}
  @keyframes goUpdSpin{to{transform:rotate(360deg);}}

  /* shared storm layer — same placement vocabulary across all concepts */
  .go-splash .storm{position:absolute;inset:0;background:#03060a;opacity:0;z-index:5;pointer-events:none;}
  .go-splash .flashW{position:absolute;inset:0;background:#eaf4ff;opacity:0;z-index:6;pointer-events:none;}
  .go-splash .bolt{position:absolute;width:44px;opacity:0;z-index:7;pointer-events:none;filter:drop-shadow(0 0 10px rgba(170,215,255,0.95));}
  .go-splash .bolt1{top:-7%;left:15%;transform:rotate(9deg);}
  .go-splash .bolt2{top:-9%;right:11%;transform:rotate(-11deg);}
  .go-splash .bolt3{top:30%;left:50%;width:54px;margin-left:-27px;transform:rotate(3deg);}

  /* encore storm — extra bolts + distant-thunder layers on the full 4.5s splash timeline */
  .go-splash .boltX1{top:16%;left:5%;width:62px;transform:rotate(-8deg);animation:goXBolt1 4500ms ease-out both;}
  .go-splash .boltX2{top:8%;right:6%;width:36px;transform:rotate(15deg);animation:goXBolt2 4500ms ease-out both;}
  .go-splash .boltX3{top:-4%;left:39%;width:30px;transform:rotate(-4deg);animation:goXBolt3 4500ms ease-out both;}
  .go-splash .stormX{position:absolute;inset:0;background:#03060a;opacity:0;z-index:5;pointer-events:none;animation:goXStorm 4500ms ease-out both;}
  .go-splash .flashX{position:absolute;inset:0;background:#eaf4ff;opacity:0;z-index:6;pointer-events:none;animation:goXFlash 4500ms ease-out both;}
  @keyframes goXStorm{0%,5%{opacity:0;}7%{opacity:.5;}9%{opacity:.12;}12%{opacity:.45;}15%{opacity:.1;}19%{opacity:.42;}22%{opacity:0;}56%{opacity:0;}58%{opacity:.5;}60%{opacity:.14;}61.5%{opacity:.55;}64%{opacity:0;}79%{opacity:0;}81%{opacity:.45;}83%{opacity:.1;}84.5%{opacity:.5;}87%{opacity:0;}100%{opacity:0;}}
  @keyframes goXFlash{0%,6.5%{opacity:0;}7.5%{opacity:.45;}9%{opacity:0;}13.5%{opacity:0;}14.5%{opacity:.4;}16%{opacity:0;}58.5%{opacity:0;}59.5%{opacity:.4;}61%{opacity:0;}81%{opacity:0;}82%{opacity:.38;}83.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goXBolt1{0%,6%{opacity:0;}7.5%{opacity:1;}9.5%{opacity:0;}10.5%{opacity:.85;}12%{opacity:0;}57.5%{opacity:0;}59%{opacity:1;}60.5%{opacity:0;}61.5%{opacity:.8;}63%{opacity:0;}100%{opacity:0;}}
  @keyframes goXBolt2{0%,13%{opacity:0;}14.5%{opacity:1;}16.5%{opacity:0;}80%{opacity:0;}81.5%{opacity:1;}83%{opacity:0;}84%{opacity:.9;}85.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goXBolt3{0%,19.5%{opacity:0;}21%{opacity:1;}23%{opacity:0;}59%{opacity:0;}60.5%{opacity:.9;}62%{opacity:0;}81.5%{opacity:0;}83%{opacity:1;}85%{opacity:0;}100%{opacity:0;}}

  /* ============ A · IGNITION (storm intro → amber ignition) ============ */
  .go-splash.cA .scrbg{position:absolute;inset:0;background:${GPT_T.paper};opacity:0;animation:goATurnOn 2660ms ease-out both;z-index:1;}
  .go-splash.cA .glowA{position:absolute;width:360px;height:360px;border-radius:50%;
    background:radial-gradient(circle,rgba(224,138,0,0.55),rgba(224,138,0,0.18) 38%,transparent 68%);
    filter:blur(6px);opacity:0;transform:scale(.4);animation:goAGlow 2660ms ease-out both;z-index:1;}
  .go-splash.cA .markwrap{filter:drop-shadow(0 12px 30px rgba(224,138,0,0.45));opacity:0;transform:scale(.7);animation:goAMark 2660ms cubic-bezier(.2,.8,.2,1) both;}
  .go-splash.cA .word{opacity:0;transform:translateY(14px);animation:goARise 2660ms ease-out both;}
  .go-splash.cA .tag{opacity:0;transform:translateY(12px);animation:goARise2 2660ms ease-out both;}
  .go-splash.cA .url{opacity:0;animation:goAFadeUrl 2660ms ease-out both;}
  .go-splash.cA .storm{animation:goAStorm 2660ms ease-out both;}
  .go-splash.cA .flashW{animation:goAFlashW 2660ms ease-out both;}
  .go-splash.cA .bolt1{animation:goABolt1 2660ms ease-out both;}
  .go-splash.cA .bolt2{animation:goABolt2 2660ms ease-out both;}
  @keyframes goAGlow{0%,24%{opacity:0;transform:scale(.4);}30%{opacity:1;transform:scale(1);}46%{opacity:.85;transform:scale(1.04);}100%{opacity:.5;transform:scale(1.0);}}
  @keyframes goAMark{0%,26%{opacity:0;transform:scale(.7);}30%{opacity:1;transform:scale(1.06);}40%{transform:scale(1);}100%{opacity:1;transform:scale(1);}}
  @keyframes goATurnOn{0%,24%{opacity:0;}30%{opacity:.35;}52%{opacity:1;}100%{opacity:1;}}
  @keyframes goARise{0%,50%{opacity:0;transform:translateY(14px);}62%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goARise2{0%,62%{opacity:0;transform:translateY(12px);}74%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goAFadeUrl{0%,78%{opacity:0;}90%{opacity:1;}100%{opacity:1;}}
  @keyframes goAStorm{0%{opacity:0;}4%{opacity:.25;}7%{opacity:.8;}11%{opacity:.12;}16%{opacity:.72;}20%{opacity:.1;}25%{opacity:.5;}29%{opacity:0;}100%{opacity:0;}}
  @keyframes goAFlashW{0%,6%{opacity:0;}7.5%{opacity:.8;}9.5%{opacity:0;}15%{opacity:0;}16.5%{opacity:.82;}18.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goABolt1{0%,6%{opacity:0;}7.5%{opacity:1;}10.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goABolt2{0%,15%{opacity:0;}16.5%{opacity:1;}19.5%{opacity:0;}100%{opacity:0;}}

  /* ============ B · THUNDERSTORM (3.4s) — full storm, design original ============ */
  .go-splash.cB .scrbg{position:absolute;inset:0;background:${GPT_T.paper};opacity:0;animation:goBTurnOn 3400ms steps(1,end) both;z-index:0;}
  .go-splash.cB .surge{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,220,150,0.9),rgba(224,138,0,0.25) 45%,transparent 70%);opacity:0;animation:goBSurge 3400ms ease-out both;z-index:1;}
  .go-splash.cB .bulbDark{position:absolute;animation:goBDark 3400ms steps(1,end) both;}
  .go-splash.cB .bulbDark svg{width:132px;height:132px;display:block;}
  .go-splash.cB .markwrap{filter:drop-shadow(0 12px 26px rgba(224,138,0,0.4));opacity:0;transform:scale(.92);animation:goBMark 3400ms ease-out both;}
  .go-splash.cB .word{opacity:0;transform:translateY(14px);animation:goBRise 3400ms ease-out both;}
  .go-splash.cB .tag{opacity:0;transform:translateY(12px);animation:goBRise2 3400ms ease-out both;}
  .go-splash.cB .url{opacity:0;animation:goBUrl 3400ms ease-out both;}
  .go-splash.cB .storm{animation:goBStorm 3400ms ease-out both;}
  .go-splash.cB .flashW{animation:goBFlashW 3400ms ease-out both;}
  .go-splash.cB .bolt1{animation:goBBolt1 3400ms ease-out both;}
  .go-splash.cB .bolt2{animation:goBBolt2 3400ms ease-out both;}
  .go-splash.cB .bolt3{animation:goBBolt3 3400ms ease-out both;}
  @keyframes goBTurnOn{0%{opacity:0;}6%{opacity:1;}8%{opacity:0;}16%{opacity:1;}19%{opacity:0;}26%{opacity:1;}30%{opacity:0;}35%{opacity:1;}100%{opacity:1;}}
  @keyframes goBSurge{0%,33%{opacity:0;}35%{opacity:1;}45%{opacity:.4;}55%{opacity:0;}63%{opacity:0;}66%{opacity:.55;}72%{opacity:0;}100%{opacity:0;}}
  @keyframes goBDark{0%{opacity:1;}34%{opacity:1;}35%{opacity:0;}100%{opacity:0;}}
  @keyframes goBMark{0%,34%{opacity:0;transform:scale(.92);}37%{opacity:1;transform:scale(1.07);}45%{transform:scale(1);}100%{opacity:1;transform:scale(1);}}
  @keyframes goBRise{0%,43%{opacity:0;transform:translateY(14px);}53%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goBRise2{0%,53%{opacity:0;transform:translateY(12px);}61%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goBUrl{0%,74%{opacity:0;}84%{opacity:1;}100%{opacity:1;}}
  @keyframes goBStorm{0%{opacity:0;}5%{opacity:.25;}7%{opacity:.92;}11%{opacity:.12;}16%{opacity:.94;}20%{opacity:.08;}26%{opacity:.96;}31%{opacity:.2;}35%{opacity:0;}63%{opacity:0;}65%{opacity:.97;}70%{opacity:.97;}73%{opacity:0;}100%{opacity:0;}}
  @keyframes goBFlashW{0%,5%{opacity:0;}6.5%{opacity:.85;}8.5%{opacity:0;}15%{opacity:0;}16.5%{opacity:.9;}18.5%{opacity:0;}25%{opacity:0;}26.5%{opacity:1;}28.5%{opacity:0;}64%{opacity:0;}65.5%{opacity:.95;}68%{opacity:0;}100%{opacity:0;}}
  @keyframes goBBolt1{0%,5%{opacity:0;}6.5%{opacity:1;}9.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goBBolt2{0%,15%{opacity:0;}16.5%{opacity:1;}19.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goBBolt3{0%,25%{opacity:0;}26.5%{opacity:1;}29.5%{opacity:0;}64%{opacity:0;}65.5%{opacity:1;}68.5%{opacity:0;}100%{opacity:0;}}

  /* ============ C · LIGHTNING STRIKE (white support strikes → blue hero bolt → thunder beat) ====== */
  .go-splash.cC .boltwrap{position:absolute;top:0;left:50%;transform:translateX(-50%);width:150px;height:150px;display:flex;align-items:center;justify-content:center;}
  .go-splash.cC .boltC{width:64px;height:120px;clip-path:inset(0 0 100% 0);opacity:0;animation:goCBolt 2660ms cubic-bezier(.7,0,.3,1) both;filter:drop-shadow(0 0 14px rgba(14,80,160,0.5));}
  .go-splash.cC .markwrap{opacity:0;transform:scale(1.25);animation:goCMark 2660ms cubic-bezier(.2,.85,.25,1) both;}
  .go-splash.cC .word{opacity:0;transform:translateY(14px);animation:goCRise 2660ms ease-out both;}
  .go-splash.cC .tag{opacity:0;transform:translateY(12px);animation:goCRise2 2660ms ease-out both;}
  .go-splash.cC .url{opacity:0;animation:goCUrl 2660ms ease-out both;}
  .go-splash.cC .storm{animation:goCStorm 2660ms ease-out both;}
  .go-splash.cC .flashW{animation:goCFlashW 2660ms ease-out both;}
  .go-splash.cC .bolt1{animation:goCBolt1 2660ms ease-out both;}
  .go-splash.cC .bolt2{animation:goCBolt2 2660ms ease-out both;}
  @keyframes goCBolt{0%,4%{opacity:0;clip-path:inset(0 0 100% 0);}8%{opacity:1;}22%{opacity:1;clip-path:inset(0 0 0 0);}32%{opacity:1;}36%{opacity:0;}100%{opacity:0;}}
  @keyframes goCMark{0%,30%{opacity:0;transform:scale(1.25);}38%{opacity:1;transform:scale(1.06);}48%{transform:scale(1);}100%{opacity:1;transform:scale(1);}}
  @keyframes goCRise{0%,52%{opacity:0;transform:translateY(14px);}64%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goCRise2{0%,64%{opacity:0;transform:translateY(12px);}76%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
  @keyframes goCUrl{0%,78%{opacity:0;}90%{opacity:1;}100%{opacity:1;}}
  @keyframes goCStorm{0%{opacity:0;}5%{opacity:.55;}9%{opacity:.85;}14%{opacity:.3;}19%{opacity:0;}62%{opacity:0;}64%{opacity:.88;}69%{opacity:0;}100%{opacity:0;}}
  @keyframes goCFlashW{0%,6%{opacity:0;}7.5%{opacity:.7;}9.5%{opacity:0;}18%{opacity:0;}21%{opacity:.92;}28%{opacity:0;}62%{opacity:0;}63.5%{opacity:.85;}66%{opacity:0;}100%{opacity:0;}}
  @keyframes goCBolt1{0%,6%{opacity:0;}7.5%{opacity:1;}10.5%{opacity:0;}100%{opacity:0;}}
  @keyframes goCBolt2{0%,15%{opacity:0;}16.5%{opacity:1;}19.5%{opacity:0;}100%{opacity:0;}}

  @media (prefers-reduced-motion: reduce){
    .go-splash .markwrap,.go-splash .word,.go-splash .tag,.go-splash .url{animation:none!important;opacity:1!important;transform:none!important;}
  }
`
