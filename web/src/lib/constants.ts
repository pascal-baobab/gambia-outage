// constants.ts — client-side thresholds that must mirror the backend / prototype.
// Trust layer: see prompt-claude-code.md §4.4 + design/features.jsx.

/** App version — shown in About (settings) and discreetly on the splash so users can confirm which
 *  build is loaded. Bump on every meaningful release. The splash also force-applies a newer deployed
 *  build under its animation (see lib/appRefresh.ts), so this number reflects what's actually running. */
export const APP_VERSION = '0.119'
export const APP_VERSION_DATE = '12 Jun 2026 · 09:43'

/** Distinct rl_key OUT reports (last 60 min) needed to mark a zone "confirmed". Mirrors features.jsx. */
export const CONFIRM_THRESHOLD = 8

/** Max length of a neighbour note. Mirrors §4.8 NOTE_MAX + screen-report.jsx. */
export const NOTE_MAX = 140

/** Regions total (7 macro areas). Mirrors the launch seed (§5.1). */
export const REGIONS_TOTAL = 7

/** GPS snap radius (km) — nearest settlement centroid fallback (§5). */
export const SNAP_RADIUS_KM = 3

/** Re-show the PWA install sheet every N successful reports after a dismissal (Phase 6 §6.9). */
export const PWA_REPROMPT_REPORTS = 3

/** Phase 5 — the illustrative historical week seeded into `weekly_honors` (25–31 May 2026). Rows for
 * this week are `illustrative=true` and MUST render the "Illustrative — historical estimate" label. */
export const HONOR_SEED_WEEK = '2026-W22'

/** Human label for the illustrative week in the WeekPicker. */
export const HONOR_SEED_LABEL = '25–31 May'

/**
 * Mini radio player — a curated set of African stations the user can switch between via a discreet
 * picker (the player streams ONE at a time; selection persists in localStorage `go_radio_station`).
 * Each is a direct stream that plays in a plain <audio> with no backend proxy — cross-origin playback
 * needs no CORS. HARD CONSTRAINT: every URL MUST be **https** (the site is HTTPS, so an http stream
 * is blocked as mixed-content). All entries below were verified live (200 audio/*) + browser-decodable
 * (`loadedmetadata`) on 2026-06-08 (FIP trio: 2026-06-10). Spread: Nigeria (Afrobeats), Ghana,
 * Senegal (incl. Pulaar/Fula — directly relevant to The Gambia), pan-African, FIP (Radio France).
 *
 * SECOND HARD CONSTRAINT (2026-06-10): every station MUST expose live now-playing metadata
 * (artist/title), verified per provider: Zeno → SSE `api.zeno.fm/mounts/metadata/subscribe/<mount>`;
 * AzuraCast (LagosJump, Afro Radio) → `/api/nowplaying`; Radio.co → `public.radio.co/stations/<id>/status`;
 * Dakar City → inline ICY (`icy-metaint`); FIP → `api.radiofrance.fr/livemeta/pull/<id>` (jazz=65,
 * monde=69, reggae=71). Africa Radio Naija was dropped for this reason (empty StreamTitle).
 *
 * radio.garden channels are resolved ONCE to their stream URL (Cloudflare-gated, not at runtime):
 *   curl -sI -A "<browser UA>" -e "https://radio.garden/listen/<slug>/<id>" \
 *     "https://radio.garden/api/ara/content/listen/<id>/channel.mp3"   # → 302 Location
 */
export interface RadioStation {
  url: string
  name: string
  tag?: string // short origin/genre subtitle for the picker (e.g. "Dakar · Pulaar")
}
export const RADIO_STATIONS: RadioStation[] = [
  { url: 'https://radio.lagosjumpradio.com/listen/lagosjump_radio/radio.mp3', name: 'LagosJump Radio', tag: 'Lagos · Afrobeats' },
  { url: 'https://stream.radiodakarcity.com/', name: 'Radio Dakar City', tag: 'Dakar · Urban' },
  { url: 'https://stream.zeno.fm/9reuhyz8up8uv', name: 'GanGan Radio', tag: 'Lagos · Yorùbá' },
  { url: 'https://stream.zeno.fm/tvqvamkwe5zuv', name: 'RadioTiwa', tag: 'Naija · Afrobeats' },
  { url: 'https://stream.zeno.fm/kqgbf9g3mfhvv', name: 'Yes FM Lagos', tag: 'Lagos · Urban' },
  { url: 'https://streaming.radio.co/s92f890821/listen', name: 'Ghana Music Radio', tag: 'Accra · Highlife' },
  { url: 'https://stream.zeno.fm/7cru7g7rcwzuv', name: 'Love FM Dakar', tag: 'Dakar · Urban' },
  { url: 'https://stream-154.zeno.fm/t8gcyq6ts0quv', name: 'FM Sénégal', tag: 'Dakar · Mbalax' },
  { url: 'https://stream.zeno.fm/e0grbn8e3rquv', name: 'Radio Fulbe', tag: 'Dakar · Pulaar' },
  { url: 'https://stream.zeno.fm/4yx608hnu1duv', name: 'Timtimol FM', tag: 'Pulaar' },
  { url: 'https://itsshort.info/listen/afroradio/radio.mp3', name: 'Afro Radio', tag: 'Pan-African' },
  { url: 'https://icecast.radiofrance.fr/fipjazz-midfi.mp3', name: 'FIP Jazz', tag: 'Paris · Jazz' },
  { url: 'https://icecast.radiofrance.fr/fipreggae-midfi.mp3', name: 'FIP Reggae', tag: 'Paris · Reggae' },
  { url: 'https://icecast.radiofrance.fr/fipworld-midfi.mp3', name: 'FIP Monde', tag: 'Paris · Musiques du monde' },
]
/** Back-compat aliases → the default station ([0]). */
export const RADIO_URL = RADIO_STATIONS[0].url
export const RADIO_NAME = RADIO_STATIONS[0].name
