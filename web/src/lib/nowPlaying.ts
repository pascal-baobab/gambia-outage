// nowPlaying.ts — live "now playing" (artist/title + artwork) for the radio strip.
//
// Every station in RADIO_STATIONS is REQUIRED to expose live track metadata (see the constraint
// above the list in constants.ts); this module maps each station URL to its provider source and
// normalises the payloads to one shape. All sources are browser-reachable (CORS `*`, verified
// 2026-06-10) — no backend involved. The one exception is Radio Dakar City (inline-ICY only, not
// readable cross-origin from a browser): it degrades to no track line.
//
// Sources:
//   • Zeno        → SSE  https://api.zeno.fm/mounts/metadata/subscribe/<mount> (push on song change)
//   • AzuraCast   → GET  <base>/api/nowplaying/<station>   (artist/title/art already split)
//   • Radio.co    → GET  https://public.radio.co/stations/<id>/status (free-text title + artwork)
//   • FIP         → GET  https://api.radiofrance.fr/livemeta/pull/<id> (steps windowed on `now`,
//                   `end` of the current song drives the next poll — near-instant track changes)
//
// Battery/data: a subscription exists ONLY while the radio is audible (the hook tears it down on
// pause/stop), and polls are tiny JSON GETs every ≤60s.
import { useEffect, useState } from 'react'
import { useRadio } from '@/app/radioStore'
import { RADIO_STATIONS } from '@/lib/constants'

export interface NowPlaying {
  artist: string // '' when the source gives a single free-text line with no separator
  title: string
  artwork?: string
}

export type Provider =
  | { kind: 'zeno'; mount: string }
  | { kind: 'poll'; api: string; parse: 'azuracast' | 'radioco' | 'fip' }
  | { kind: 'none' }

/** FIP webradios — icecast mount name → historical livemeta station id. */
const FIP_IDS: Record<string, number> = { fipjazz: 65, fipworld: 69, fipreggae: 71 }

/** AzuraCast instances whose public stream URL sits on a different host than the API. */
const AZURACAST_API_HOST: Record<string, string> = { 'itsshort.info': 'live.afro.radio' }

export function providerFor(stationUrl: string): Provider {
  let u: URL
  try {
    u = new URL(stationUrl)
  } catch {
    return { kind: 'none' }
  }
  const host = u.hostname
  const parts = u.pathname.split('/').filter(Boolean)

  if (host === 'stream.zeno.fm' || /^stream(-\d+)?\.zeno\.fm$/.test(host)) {
    return parts[0] ? { kind: 'zeno', mount: parts[0] } : { kind: 'none' }
  }
  if (host === 'streaming.radio.co' && parts[0]) {
    return { kind: 'poll', api: `https://public.radio.co/stations/${parts[0]}/status`, parse: 'radioco' }
  }
  if (host === 'icecast.radiofrance.fr' && parts[0]) {
    const mount = parts[0].replace(/-(hifi|midfi|lofi).*$/, '')
    const id = FIP_IDS[mount]
    if (id) return { kind: 'poll', api: `https://api.radiofrance.fr/livemeta/pull/${id}`, parse: 'fip' }
    return { kind: 'none' }
  }
  // AzuraCast convention: /listen/<station>/<file>
  if (parts[0] === 'listen' && parts[1]) {
    const apiHost = AZURACAST_API_HOST[host] || host
    return { kind: 'poll', api: `https://${apiHost}/api/nowplaying/${parts[1]}`, parse: 'azuracast' }
  }
  return { kind: 'none' }
}

/** Free-text "Artist - Title" convention: split on the FIRST " - "; no separator → title only. */
export function splitStreamTitle(raw: string): { artist: string; title: string } {
  const s = raw.replace(/^now on air:\s*/i, '').trim()
  const i = s.indexOf(' - ')
  if (i < 0) return { artist: '', title: s }
  return { artist: s.slice(0, i).trim(), title: s.slice(i + 3).trim() }
}

interface ZenoPayload {
  mount?: string
  streamTitle?: string
  streamUrl?: string // query-string-ish "&artist=X&album=Y" some mounts attach
}
export function parseZeno(d: ZenoPayload): NowPlaying | null {
  const raw = (d.streamTitle || '').trim()
  if (!raw) return null
  const { artist, title } = splitStreamTitle(raw)
  if (artist) return { artist, title }
  const paramArtist = new URLSearchParams(d.streamUrl || '').get('artist')?.trim() || ''
  return { artist: paramArtist, title }
}

interface AzuracastPayload {
  now_playing?: { song?: { artist?: string; title?: string; art?: string } }
}
export function parseAzuracast(d: AzuracastPayload): NowPlaying | null {
  const song = d.now_playing?.song
  const artist = song?.artist?.trim() || ''
  const title = song?.title?.trim() || ''
  if (!artist && !title) return null
  return { artist, title, ...(song?.art ? { artwork: song.art } : {}) }
}

interface RadiocoPayload {
  current_track?: { title?: string; artwork_url?: string; artwork_url_large?: string }
}
export function parseRadioco(d: RadiocoPayload): NowPlaying | null {
  const track = d.current_track
  if (!track?.title?.trim()) return null
  const { artist, title } = splitStreamTitle(track.title)
  const artwork = track.artwork_url_large || track.artwork_url
  return { artist, title, ...(artwork ? { artwork } : {}) }
}

interface FipStep {
  title?: string
  authors?: string
  performers?: string
  start?: number
  end?: number
  embedType?: string
  visual?: string
}
export function parseFip(
  d: { steps?: Record<string, FipStep> },
  nowSec: number,
): { np: NowPlaying | null; refreshInSec: number | null } {
  for (const s of Object.values(d.steps || {})) {
    if (s.embedType !== 'song' || !s.title) continue
    if ((s.start ?? 0) <= nowSec && nowSec <= (s.end ?? 0)) {
      const artist = s.performers?.trim() || s.authors?.trim() || ''
      return {
        np: { artist, title: s.title, ...(s.visual ? { artwork: s.visual } : {}) },
        refreshInSec: (s.end ?? nowSec) - nowSec,
      }
    }
  }
  return { np: null, refreshInSec: null }
}

const POLL_MS = 30_000
const MIN_POLL_MS = 5_000
const MAX_POLL_MS = 60_000

/**
 * Subscribe to a station's now-playing feed. Calls `cb` with each update (or null when unknown).
 * Returns an unsubscribe. Zeno is push (one SSE, auto-reconnecting); the rest poll small JSON.
 */
export function subscribeNowPlaying(stationUrl: string, cb: (np: NowPlaying | null) => void): () => void {
  const p = providerFor(stationUrl)
  if (p.kind === 'none') return () => {}

  if (p.kind === 'zeno') {
    const es = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${p.mount}`)
    es.onmessage = (ev) => {
      try {
        cb(parseZeno(JSON.parse(ev.data)))
      } catch {
        /* malformed event — keep listening */
      }
    }
    return () => es.close()
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let dead = false
  async function tick(): Promise<void> {
    let delay = POLL_MS
    try {
      const res = await fetch(p.kind === 'poll' ? p.api : '')
      const json = await res.json()
      if (dead) return
      if (p.kind === 'poll' && p.parse === 'fip') {
        const { np, refreshInSec } = parseFip(json, Date.now() / 1000)
        cb(np)
        // Re-poll just after the current song ends → near-instant track changes.
        if (refreshInSec !== null) delay = Math.min(Math.max(refreshInSec * 1000 + 2000, MIN_POLL_MS), MAX_POLL_MS)
      } else if (p.kind === 'poll') {
        cb(p.parse === 'azuracast' ? parseAzuracast(json) : parseRadioco(json))
      }
    } catch {
      /* network hiccup — keep polling */
    }
    if (!dead) timer = setTimeout(tick, delay)
  }
  tick()
  return () => {
    dead = true
    if (timer) clearTimeout(timer)
  }
}

/** Mirror the track onto the lockscreen/notification (overrides the store's station-level metadata). */
function setTrackMediaSession(np: NowPlaying, stationName: string): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const MM = (globalThis as { MediaMetadata?: typeof MediaMetadata }).MediaMetadata
  if (!MM) return
  navigator.mediaSession.metadata = new MM({
    title: np.title,
    artist: np.artist || stationName,
    album: stationName,
    artwork: [np.artwork ? { src: np.artwork } : { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  })
}

/**
 * Now-playing for the CURRENT station, live only while the radio is audible.
 * Resets to null on station change / pause so a stale track never shows.
 */
export function useNowPlaying(): NowPlaying | null {
  const status = useRadio((s) => s.status)
  const stationIndex = useRadio((s) => s.stationIndex)
  const active = status === 'playing' || status === 'loading'
  const [np, setNp] = useState<NowPlaying | null>(null)

  useEffect(() => {
    setNp(null)
    if (!active) return
    const station = RADIO_STATIONS[stationIndex] || RADIO_STATIONS[0]
    return subscribeNowPlaying(station.url, setNp)
  }, [active, stationIndex])

  useEffect(() => {
    if (!np) return
    const station = RADIO_STATIONS[stationIndex] || RADIO_STATIONS[0]
    setTrackMediaSession(np, station.name)
  }, [np, stationIndex])

  return np
}
