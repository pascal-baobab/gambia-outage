// radioStore.ts — the mini radio player's state (Zustand) + a single, app-lifetime <audio>.
//
// Exclusive playback: one audio source at a time, app-wide. The audio element is a MODULE-LEVEL
// SINGLETON (created lazily, outside the React tree) so it keeps playing across tab navigation and
// is never remounted. LIVE video embeds are cross-origin iframes (can't be paused via JS), so we
// bridge exclusivity both ways with a counter:
//   • radio → video: play() bumps `collapseSignal`; LiveStrip/CommunityLinks collapse their open iframe.
//   • video → radio: a video embed opening calls videoTookOver() → radio pauses.
//
// The audio element is built via an injectable factory so the store is testable in the `node` vitest
// env (no jsdom) — see radioStore.test.ts.
import { create } from 'zustand'
import { RADIO_STATIONS } from '@/lib/constants'

export type RadioStatus = 'idle' | 'loading' | 'playing' | 'error'

const STATION_KEY = 'go_radio_station' // persisted selected-station index (device-local)
const FAV_KEY = 'go_radio_favorites' // persisted favourite-station URLs (device-local, per user/device)

function initialStationIndex(): number {
  try {
    const n = parseInt(localStorage.getItem(STATION_KEY) || '', 10)
    if (Number.isInteger(n) && n >= 0 && n < RADIO_STATIONS.length) return n
  } catch { /* storage unavailable */ }
  return 0
}

// Favourites are keyed by station URL (stable identity — the name/tag may change, the stream URL is
// the station). Stored as a JSON array; unknown URLs (a station later removed from RADIO_STATIONS)
// are tolerated and simply never match.
function initialFavorites(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string')
  } catch { /* storage unavailable / bad json */ }
  return []
}

interface RadioState {
  status: RadioStatus
  /** Index into RADIO_STATIONS of the currently-selected station. */
  stationIndex: number
  /** Increments each time the radio takes over playback. Consumers collapse their video iframes on change. */
  collapseSignal: number
  /** Favourite station URLs (device-local). The picker stars these and floats them to the top. */
  favorites: string[]
  /** Add/remove a station URL from favourites (persisted). */
  toggleFavorite: (url: string) => void
  toggle: () => void
  play: () => void
  pause: () => void
  /** Switch to a specific station; if currently playing, retunes live (without re-collapsing videos). */
  setStation: (index: number) => void
  /** Cycle to the next station (wraps). */
  nextStation: () => void
  /** A video embed started playing — pause the radio WITHOUT re-signalling a collapse. */
  videoTookOver: () => void
}

interface AudioLike {
  src: string
  preload: string
  play: () => Promise<void> | void
  pause: () => void
  addEventListener: (type: string, listener: () => void) => void
}

let audio: AudioLike | null = null
let factory: () => AudioLike = () => new Audio()

/** Test seam: swap the audio factory and reset the singleton. */
export function __setAudioFactory(f: () => AudioLike): void {
  factory = f
  audio = null
}

function setMediaSessionMetadata(stationName: string): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const MM = (globalThis as { MediaMetadata?: typeof MediaMetadata }).MediaMetadata
  if (!MM) return
  navigator.mediaSession.metadata = new MM({
    title: stationName,
    artist: 'LIVE',
    artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  })
}

export const useRadio = create<RadioState>((set, get) => {
  function ensureAudio(): AudioLike {
    if (audio) return audio
    const a = factory()
    a.preload = 'none'
    a.addEventListener('playing', () => set({ status: 'playing' }))
    a.addEventListener('waiting', () => set((s) => (s.status === 'idle' ? s : { status: 'loading' })))
    a.addEventListener('pause', () =>
      set((s) => (s.status === 'playing' || s.status === 'loading' ? { status: 'idle' } : s)),
    )
    a.addEventListener('error', () => set({ status: 'error' }))
    audio = a
    return a
  }

  return {
    status: 'idle',
    stationIndex: initialStationIndex(),
    collapseSignal: 0,
    favorites: initialFavorites(),

    toggleFavorite(url) {
      const cur = get().favorites
      const next = cur.includes(url) ? cur.filter((u) => u !== url) : [...cur, url]
      set({ favorites: next })
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
    },

    play() {
      const a = ensureAudio()
      const station = RADIO_STATIONS[get().stationIndex] || RADIO_STATIONS[0]
      if (a.src !== station.url) a.src = station.url
      // Radio takes over: signal consumers to collapse any open video embed.
      set({ status: 'loading', collapseSignal: get().collapseSignal + 1 })
      const p = a.play() as unknown as Promise<void> | undefined
      if (p && typeof p.catch === 'function') p.catch(() => set({ status: 'error' }))
      setMediaSessionMetadata(station.name)
    },

    pause() {
      audio?.pause()
      set({ status: 'idle' })
    },

    toggle() {
      const playing = get().status === 'playing' || get().status === 'loading'
      if (playing) get().pause()
      else get().play()
    },

    setStation(index) {
      const i = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length
      if (i === get().stationIndex) return
      set({ stationIndex: i })
      try { localStorage.setItem(STATION_KEY, String(i)) } catch { /* */ }
      const station = RADIO_STATIONS[i]
      const wasOn = get().status === 'playing' || get().status === 'loading'
      if (wasOn && audio) {
        // Retune live: swap the source and keep playing. Do NOT bump collapseSignal (already the radio).
        audio.src = station.url
        set({ status: 'loading' })
        const p = audio.play() as unknown as Promise<void> | undefined
        if (p && typeof p.catch === 'function') p.catch(() => set({ status: 'error' }))
      }
      setMediaSessionMetadata(station.name)
    },

    nextStation() {
      get().setStation(get().stationIndex + 1)
    },

    videoTookOver() {
      // Same effect as pause(), but semantically "a video took the audio focus".
      // Crucially does NOT bump collapseSignal (we are not the one taking over).
      audio?.pause()
      set({ status: 'idle' })
    },
  }
})
