// RadioPlayer.tsx — a discreet, global play/pause strip for the mini radio. Sits in the Shell just
// above the BottomNav; the audio itself lives in the radioStore singleton, so playback survives tab
// navigation. Tapping the station name opens a discreet picker (a bottom sheet) listing the curated
// African stations (RADIO_STATIONS); choosing one retunes live if already playing. Reuses only
// existing tokens.
import { useLayoutEffect, useRef, useState } from 'react'
import { GPT_T, GPT_FONT, FLAG, ACCENT } from '@/lib/tokens'
import { useRadio } from '@/app/radioStore'
import { RADIO_STATIONS } from '@/lib/constants'
import { useNowPlaying } from '@/lib/nowPlaying'
import { useT } from '@/i18n/useT'
import { navigate } from '@/hooks/useHashRoute'

const LIVE_RED = ACCENT.live

// Live audio waveform, shown while the stream plays. The track text itself can't be read from the
// cross-origin <audio> (ICY is stripped), so lib/nowPlaying.ts fetches it from each provider's
// metadata API instead; the wave stays as the playing indicator and as the fallback when a station
// has no track info. The staggered per-bar delay makes the peak travel across, reading as a flowing
// audio wave. Keyframes injected once below.
// Ticker for the track line: when the text is wider than the strip it scrolls on a 15s cycle —
// THREE full passes, then rests at the start until the next cycle (owner: "ogni 15 secondi triplo
// giro"). Two copies of the text + translateX(-50%) make each pass loop seamlessly, so the snap
// back to 0 between passes is invisible. Text that fits stays static (a marquee on short text
// reads as a glitch). Re-measured on every track change.
function TrackTicker({ text }: { text: string }) {
  const outerRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)
  useLayoutEffect(() => {
    setOverflow(false)
  }, [text])
  useLayoutEffect(() => {
    if (overflow) return
    const o = outerRef.current
    if (o) setOverflow(o.scrollWidth > o.clientWidth + 1)
  }, [text, overflow])
  return (
    <span ref={outerRef} style={{ display: 'block', minWidth: 0, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: overflow ? 'clip' : 'ellipsis' }}>
      {overflow ? (
        <span style={{ display: 'inline-flex', animation: 'goTrackLoop 15s linear infinite', willChange: 'transform' }}>
          <span style={{ paddingInlineEnd: 28 }}>{text}</span>
          <span aria-hidden style={{ paddingInlineEnd: 28 }}>{text}</span>
        </span>
      ) : (
        text
      )}
    </span>
  )
}

const WAVE_BARS = 16
function Waveform({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 13, flexShrink: 0 }} aria-hidden>
      {Array.from({ length: WAVE_BARS }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 13,
            background: color,
            borderRadius: 1,
            transformOrigin: 'center',
            animation: `goWave 1.1s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

export function RadioPlayer() {
  const t = useT()
  const status = useRadio((s) => s.status)
  const toggle = useRadio((s) => s.toggle)
  const stationIndex = useRadio((s) => s.stationIndex)
  const active = status === 'playing' || status === 'loading'
  const station = RADIO_STATIONS[stationIndex] || RADIO_STATIONS[0]
  const canPick = RADIO_STATIONS.length > 1
  const [picker, setPicker] = useState(false)
  // Add-ons launcher (discoverability fix): the global strip is the entry point to every add-on —
  // Radio (this picker), Calculator, Photo-Crush, Zone Leaderboard — reachable from any screen
  // instead of buried in the Home Tools hub.
  const [menu, setMenu] = useState(false)

  const np = useNowPlaying()
  const track = np ? (np.artist ? `${np.artist} — ${np.title}` : np.title) : null
  const sub =
    status === 'loading'
      ? t.radio.connecting
      : status === 'error'
        ? t.radio.unavailable
        : status === 'playing'
          ? track || t.radio.playing
          : t.radio.paused

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: GPT_T.paper,
        borderTop: `1px solid ${GPT_T.line}`,
        padding: '5px 14px',
        flexShrink: 0,
      }}
    >
      {/* goTrackLoop: 3 seamless passes (3.5s each, snap at -50% is invisible — see TrackTicker), then rest until 15s. */}
      <style>{'@keyframes goWave{0%,100%{transform:scaleY(0.22)}50%{transform:scaleY(1)}}@keyframes goRpFade{from{opacity:0}to{opacity:1}}@keyframes goTrackLoop{0%{transform:translateX(0)}23.3%{transform:translateX(-50%)}23.34%{transform:translateX(0)}46.63%{transform:translateX(-50%)}46.67%{transform:translateX(0)}69.96%{transform:translateX(-50%)}70%,100%{transform:translateX(0)}}'}</style>

      {/* Add-ons launcher — opens the add-ons menu (Radio / Calculator / Photo-Crush / Leaderboard). */}
      <button
        onClick={() => setMenu(true)}
        aria-label={t.tools.addOns}
        aria-haspopup="menu"
        aria-expanded={menu}
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 9,
          border: `1.5px solid ${menu ? GPT_T.ink : GPT_T.line}`,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: menu ? GPT_T.ink : GPT_T.wash,
          color: menu ? '#fff' : GPT_T.ink70,
        }}
      >
        <AppsIcon />
      </button>

      <button
        onClick={toggle}
        aria-label={active ? t.radio.pauseAria : t.radio.playAria}
        aria-pressed={active}
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? GPT_T.ink : GPT_T.wash,
          color: active ? '#fff' : GPT_T.ink,
        }}
      >
        {status === 'loading' ? <Spinner /> : active ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Album artwork, only when the provider gives one (decorative — the track text carries the info). */}
      {active && np?.artwork && (
        <img
          key={np.artwork}
          src={np.artwork}
          alt=""
          width={30}
          height={30}
          style={{ flexShrink: 0, borderRadius: 7, objectFit: 'cover', border: `1px solid ${GPT_T.line}`, animation: 'goRpFade .25s ease' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      {/* Tapping the station opens the discreet picker. */}
      <button
        onClick={() => canPick && setPicker(true)}
        aria-label={canPick ? t.radio.stationChangeAria(station.name) : station.name}
        aria-haspopup={canPick ? 'listbox' : undefined}
        disabled={!canPick}
        style={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: canPick ? 'pointer' : 'default',
          textAlign: 'start',
          fontFamily: GPT_FONT,
        }}
      >
        <span style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {station.name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: status === 'error' ? LIVE_RED : GPT_T.ink45, letterSpacing: '.04em' }}>
            {status === 'playing' ? (
              <Waveform color={FLAG.green} />
            ) : status !== 'error' ? (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: LIVE_RED }} />
            ) : null}
            <TrackTicker text={sub} />
          </span>
        </span>
        {canPick && <ChevronUp />}
      </button>

      {picker && <StationPicker current={stationIndex} onClose={() => setPicker(false)} />}
      {menu && (
        <AddOnsMenu
          onClose={() => setMenu(false)}
          onRadio={() => { setMenu(false); if (canPick) setPicker(true) }}
        />
      )}
    </div>
  )
}

// Add-ons menu — bottom sheet (mirrors StationPicker) listing every add-on. The global radio strip
// is the single discoverable entry point; Calculator/Photo-Crush/Leaderboard navigate to their routes,
// Radio opens the station picker (the strip already controls playback).
function AddOnsMenu({ onClose, onRadio }: { onClose: () => void; onRadio: () => void }) {
  const t = useT()
  const status = useRadio((s) => s.status)
  const radioActive = status === 'playing' || status === 'loading'
  const go = (name: 'calculator' | 'photo-crush' | 'leaderboard') => {
    onClose()
    navigate({ name })
  }
  const rows = [
    { key: 'radio', glyph: <RadioGlyph c={FLAG.green} />, label: t.radio.pickerTitle, sub: t.radio.pickerSubtitle(RADIO_STATIONS.length), active: radioActive, onClick: onRadio },
    { key: 'calc', glyph: <CalcGlyph c={FLAG.blue} />, label: t.tools.calculator, sub: t.tools.calcSub, active: false, onClick: () => go('calculator') },
    { key: 'game', glyph: <GameGlyph c={ACCENT.tile4} />, label: t.tools.photoCrush, sub: t.tools.gameSub, active: false, onClick: () => go('photo-crush') },
    { key: 'board', glyph: <TrophyGlyph c={ACCENT.star} />, label: t.leaderboard.title, sub: t.tools.boardSub, active: false, onClick: () => go('leaderboard') },
  ]
  return (
    <div
      role="dialog"
      aria-label={t.tools.addOns}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,34,0.34)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'goRpFade .15s ease' }}
    >
      <style>{'@keyframes goRpFade{from{opacity:0}to{opacity:1}}@keyframes goRpUp{from{transform:translateY(14px)}to{transform:translateY(0)}}'}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: GPT_T.paper,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: '0 -10px 30px rgba(15,23,34,0.18)',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          fontFamily: GPT_FONT,
          animation: 'goRpUp .2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: GPT_T.line2 }} />
        </div>
        <div style={{ padding: '8px 18px 6px', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: GPT_T.ink45 }}>
          {t.tools.addOns}
        </div>
        <div role="menu" style={{ padding: '0 8px 6px' }}>
          {rows.map((r) => (
            <button
              key={r.key}
              role="menuitem"
              onClick={r.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                border: 'none',
                background: r.active ? GPT_T.wash : 'transparent',
                borderRadius: 12,
                padding: '11px 12px',
                cursor: 'pointer',
                textAlign: 'start',
                fontFamily: GPT_FONT,
              }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: r.active ? rgba(FLAG.green, 0.14) : GPT_T.wash }}>
                {r.glyph}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{r.sub}</span>
              </span>
              {r.active ? <CheckIcon /> : <ChevronRight />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function StationPicker({ current, onClose }: { current: number; onClose: () => void }) {
  const t = useT()
  const setStation = useRadio((s) => s.setStation)
  const favorites = useRadio((s) => s.favorites)
  const toggleFavorite = useRadio((s) => s.toggleFavorite)
  function choose(i: number) {
    setStation(i)
    onClose()
  }
  // Favourites float to the top (keeping each group's original order); the real RADIO_STATIONS index
  // is carried along so selection/current-highlight stay correct after reordering.
  const ordered = RADIO_STATIONS
    .map((s, i) => ({ s, i, fav: favorites.includes(s.url) }))
    .sort((a, b) => (a.fav === b.fav ? a.i - b.i : a.fav ? -1 : 1))
  const favCount = favorites.length
  return (
    <div
      role="dialog"
      aria-label={t.radio.pickerAria}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,34,0.34)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'goRpFade .15s ease' }}
    >
      <style>{'@keyframes goRpFade{from{opacity:0}to{opacity:1}}@keyframes goRpUp{from{transform:translateY(14px)}to{transform:translateY(0)}}'}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: GPT_T.paper,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: '0 -10px 30px rgba(15,23,34,0.18)',
          maxHeight: '62vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          fontFamily: GPT_FONT,
          animation: 'goRpUp .2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: GPT_T.line2 }} />
        </div>
        <div style={{ padding: '8px 18px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: GPT_T.ink }}>{t.radio.pickerTitle}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: GPT_T.ink45 }}>{t.radio.pickerSubtitle(RADIO_STATIONS.length)}</span>
        </div>
        <div role="listbox" style={{ overflow: 'auto', padding: '0 8px 4px' }}>
          {ordered.map(({ s, i, fav }, pos) => {
            const sel = i === current
            // a thin separator after the favourites block (only when there are both favourites and non-favourites)
            const showDivider = favCount > 0 && pos === favCount
            return (
              <div key={s.url}>
                {showDivider && <div style={{ height: 1, background: GPT_T.line2, margin: '4px 12px' }} />}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: sel ? GPT_T.wash : 'transparent',
                    borderRadius: 12,
                  }}
                >
                  <button
                    role="option"
                    aria-selected={sel}
                    onClick={() => choose(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 12,
                      padding: '11px 4px 11px 12px',
                      cursor: 'pointer',
                      textAlign: 'start',
                      fontFamily: GPT_FONT,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: sel ? 800 : 700, color: GPT_T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                      {s.tag && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: GPT_T.ink45, marginTop: 1 }}>{s.tag}</span>}
                    </span>
                    {sel && <CheckIcon />}
                  </button>
                  <button
                    onClick={() => toggleFavorite(s.url)}
                    aria-label={fav ? t.radio.unfavoriteAria(s.name) : t.radio.favoriteAria(s.name)}
                    aria-pressed={fav}
                    style={{
                      flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                      padding: '8px 12px 8px 6px', lineHeight: 0, fontFamily: GPT_FONT,
                    }}
                  >
                    <StarIcon filled={fav} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden style={{ animation: 'goEqSpin 0.8s linear infinite' }}>
      <style>{'@keyframes goEqSpin{to{transform:rotate(360deg)}}'}</style>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  )
}

function ChevronUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GPT_T.ink25} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FLAG.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

// Favourite star — filled gold when favourited, hollow grey otherwise.
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? ACCENT.star : 'none'} stroke={filled ? ACCENT.star : GPT_T.ink25} strokeWidth="1.8" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47L2.6 9.35l6.5-.95z" />
    </svg>
  )
}

// ── Add-ons launcher glyphs (GPTIcon has no calculator/game/trophy cases — inline, per ToolsHub). ──
function AppsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.6" />
      <rect x="14" y="4" width="6" height="6" rx="1.6" />
      <rect x="4" y="14" width="6" height="6" rx="1.6" />
      <rect x="14" y="14" width="6" height="6" rx="1.6" />
    </svg>
  )
}

function RadioGlyph({ c }: { c: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <circle cx="15" cy="14" r="3" />
      <path d="M7 4l9 4" />
      <circle cx="7.5" cy="13.5" r="0.6" fill={c} />
    </svg>
  )
}

function CalcGlyph({ c }: { c: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="3" stroke={c} strokeWidth="2" />
      <rect x="7" y="6" width="10" height="3.5" rx="1" fill={c} />
      <g fill={c}>
        <circle cx="8.5" cy="14" r="1.1" /><circle cx="12" cy="14" r="1.1" /><circle cx="15.5" cy="14" r="1.1" />
        <circle cx="8.5" cy="17.5" r="1.1" /><circle cx="12" cy="17.5" r="1.1" /><circle cx="15.5" cy="17.5" r="1.1" />
      </g>
    </svg>
  )
}

function GameGlyph({ c }: { c: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="2" fill={c} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={c} opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={c} opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={c} />
    </svg>
  )
}

function TrophyGlyph({ c }: { c: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GPT_T.ink25} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
