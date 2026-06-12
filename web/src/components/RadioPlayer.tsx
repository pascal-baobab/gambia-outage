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
    </div>
  )
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
