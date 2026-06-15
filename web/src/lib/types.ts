// types.ts — API read-model contracts (prompt-claude-code.md §3). Shapes are returned
// VERBATIM by the backend so ported components need no reshaping. All derived fields
// (sev/status/confirmed/confirms/todayMin/week/national.*) are computed server-side.
import type { Status } from './tokens'

/** GET /api/go/snapshot — lean first-paint payload (Home + List headers). Target < 6 KB gz. */
export interface Snapshot {
  updatedAt: string // ISO UTC
  national: National
  macros: MacroPin[]
  /** Active-outage quarters (open event) at their REAL centroid → own map dots, so a single-quarter
   *  outage isn't drawn at the region pin ~up to 30 km away. Optional: absent on legacy cached rows. */
  quarters?: QuarterPin[]
  /** National community feed preview (latest notes across ALL quarters, each tagged with `where`).
   *  Powers the Home "Community feed" strip. Optional: absent on legacy cached rows. */
  feed?: NoteItem[]
}

/** A quarter (settlement) with an open event — drives the smaller per-quarter map dots. */
export interface QuarterPin {
  id: string
  name: string
  regionId: string
  lat: number
  lng: number
  sev: number
  status: Status
  reports: number
  confirms: number
  confirmed: boolean
  /** Most-recent report type on the open event — drives the SINGLE_REPORT_TRUTH bulb flip. */
  lastSignal?: 'out' | 'back' | null
  staleClose?: boolean
  since?: string | null
}

/** National rollup (also GET /api/go/national, with `date`). */
export interface National {
  hours: number
  mins: number
  regionsOut: number
  regionsTotal: number
  reports: number
  date?: string // present on /national
  /** Hourly nationwide darkness today: 24 buckets (00→24), each = fraction of regions dark (0..1).
   *  Future hours = -1 (sentinel → rendered neutral grey). Absent on legacy cached rows. */
  hourly?: number[]
}

/** Community UGC — persistent-pseudonym social layer. Never linked to anonymous reports. */
export interface Post {
  id: string
  nickname: string
  avatarId: string
  zoneId: string | null
  zoneName: string | null
  body: string
  created: string
  ago: string
}
// Zone leaderboard — pseudonym + content ONLY. NO zone/week/identifier leakage on a row
// (invariant #4: leaderboard rows are never linked back to reports/events). avatarId is
// camelCase to match the server's leaderboardRowShape.
export interface LeaderboardRow {
  id: string
  rank?: number
  nickname: string
  avatarId: string
  score: number
  ago: string
}
export interface LeaderboardResp {
  week: string
  zone: string
  zoneName: string | null
  rows: LeaderboardRow[]
}
export interface ZoneComment {
  id: string
  nickname: string
  avatarId: string
  body: string
  created: string
  ago: string
  targetType?: 'zone' | 'social' | 'question'
  targetId?: string
}
export interface SocialProfile {
  nickname: string
  avatarId: string
  bio: string
  homeZone?: string // self-declared home quarter id (NOT report-derived)
  homeZoneName?: string
  discoverable?: boolean // opt-in: appear in the Community "People nearby" grid (default off)
  acceptRequests?: boolean // receive "wave" contact requests (default on once discoverable)
  isModerator?: boolean // capability: this account may HARD-delete any content in-app (owner-granted)
}

// ── People directory — opt-in neighbour discovery + "wave" requests ──
// Pseudonym-only social graph; NEVER linked to reports. A person is addressed by their PROFILE
// RECORD ID (`id`) — the account_id capability never leaves the server.
export interface Person {
  id: string // public profile record id (the addressable handle), NOT the account_id
  nickname: string
  avatarId: string
  zoneName: string // self-declared home neighbourhood (may be '')
  rankLabel: string
  xp: number
  canWave: boolean // target currently accepts contact requests
  waveStatus: 'none' | 'pending' | 'accepted' | 'declined' // the viewer's wave to this person
}
/** One incoming "wave" in the viewer's pending-requests queue. */
export interface ContactRequest {
  id: string // connection record id — the handle to accept/decline
  personId: string
  nickname: string
  avatarId: string
  zoneName: string
  rankLabel: string
  created: string
  ago: string
}
/** The viewer's own privacy switches. */
export interface Privacy {
  discoverable: boolean
  acceptRequests: boolean
}
/** A Q&A board question ("Talk" tab). Answers are ZoneComment with targetType='question'. */
export interface Question {
  id: string
  nickname: string
  avatarId: string
  title: string
  body: string
  zone?: string
  image?: string
  created: string
  ago: string
}

/** Owner-curated external post (e.g. Facebook), ingested via the Telegram bot → "From Facebook"
 *  card. A link-out only (no embedded FB SDK/iframe). `image` is a relative PB file URL or ''. */
export interface SocialLink {
  id: string
  url: string
  title: string
  author: string // source page / profile name (e.g. "InsideGambia.com"); '' when unknown
  snippet: string
  image: string
  source: string // 'facebook' | 'link'
  pinned: boolean
  likes: number // aggregate anonymous like count (social proof); deduped server-side by daily rl_key
  isLive: boolean // true ⇒ an active live stream → rendered in the "LIVE now" strip with an embed
  platform: string // facebook|tiktok|instagram|youtube|link — picks the embed/link-out treatment
  liveExpiresAt: string // ISO or '' — auto-expiry backstop (go_decay clears is_live past this)
  created: string
  ago: string
  // ── Ingestion / trust metadata (auto-monitored Gambian pages) ──
  origin?: 'auto' | 'curated' // 'auto' = machine-monitored from a known page; else owner-curated
  trusted?: boolean // from a known, monitored Gambian page → small "verified source" mark
  official?: boolean // NAWEC (the national electricity utility) → green "OFFICIAL" badge
}

/** A USER-submitted external link ("From the community" / "Dai cittadini") — distinct from the
 *  owner-curated SocialLink. Attributed to the device pseudonym (nickname+avatarId), never linked to
 *  reports. Caption + cover image are required at submit. likes = anonymous (daily rl_key dedupe). */
export interface CommunityLink {
  id: string
  url: string
  platform: string // 'facebook' | 'tiktok'
  source: string // mirrors platform (reuses the card avatar/badge code paths)
  caption: string
  title: string // = caption (card headline)
  image: string // relative /api/files/... cover image URL
  nickname: string
  avatarId: string
  likes: number
  created: string
  ago: string
}

/** One macro-area entry in the snapshot (drives map pins + MacroHeader). */
export interface MacroPin {
  id: string
  name: string
  region: string
  sev: number
  status: Status
  todayMin: number
  reports: number
  /** Rolling count of reports in the last 24h for this region (out+back). Shown under the strip bulbs. */
  reports24h?: number
  confirms: number
  confirmed: boolean
  lastSignal?: 'out' | 'back' | null
  /** Today's last event was auto-closed (timeout) with NO restore evidence → render 'nodata', never a lit bulb. */
  staleClose?: boolean
  /** Display-shaped moment: dark since (open event) or light back since (confirmed close / post-close back). "HH:MM" today, "DD Mon · HH:MM" earlier. */
  since?: string | null
  lat: number
  lng: number
}

/** GET /api/go/macro/:id — zone detail + its quarters (drives ZoneScreen + grouped ListScreen). */
export interface Macro {
  id: string
  name: string
  region: string
  sev: number
  status: Status
  todayMin: number
  reports: number
  confirms: number
  confirmed: boolean
  lastSignal?: 'out' | 'back' | null
  staleClose?: boolean
  since?: string | null
  week: number[] // 7 days, hours/day, [oldest..today]
  events: EventItem[]
  notes: NoteItem[]
  quarters: Quarter[]
}

export interface EventItem {
  from: string
  to: string
  dur: string
  open?: boolean
  where?: string // quarter name on the region's aggregated timeline (events live on quarters)
}

export interface NoteItem {
  t: string // relative ("5m ago")
  text: string
  at?: string // absolute "DD Mon · HH:MM" (Africa/Banjul) — community feed timestamp
  where?: string // originating quarter/zone name (region feed shows which quarter)
}

/** Quarter (settlement) row. Decision Q7: quarters carry their OWN event → numeric `confirms`. */
export interface Quarter {
  id: string
  regionId: string
  name: string
  status: Status
  sev: number
  mins: number
  reports: number
  confirms: number
  confirmed: boolean
  lastSignal?: 'out' | 'back' | null
  staleClose?: boolean
  since?: string | null
  events?: EventItem[] // the quarter's OWN outage timeline (2026-06-12 — was missing; UI reused the region's)
  lat?: number
  lng?: number
  notes?: NoteItem[] // per-quarter community feed
}

// ── Phase 5 — Community / Wall of Honor (§5.8) ──────────────────────────────
// Two complementary weekly boards. Pride forms around the QUARTER (rl_key rotates daily → no
// persistent individual identity). Shapes returned VERBATIM by /api/go/community[/week/:id].

/** GET /api/go/community — live current-week boards (from the `community` read-model). */
export interface Community {
  weekId: string // current ISO week, e.g. "2026-W23"
  updatedAt: string
  national: { darkMinutes: number; activeQuarters: number; watchDays: number }
  hours: HoursRow[] // ranked worst-first
  voice: VoiceRow[] // ranked by participation
  badges?: Badge[] // earned quarter-level milestone badges
  feed?: NoteItem[] // full national community feed (latest notes across all quarters)
  ranksVisible: boolean // false during cold-start (Q21 gate) → hide per-quarter ranks
  yourArea?: { zoneId: string; rankDark?: number; rankVoice?: number }
}

/** GET /api/go/community/week/:id — a frozen weekly board (incl. the illustrative 2026-W22 seed). */
export interface CommunityWeek {
  weekId: string
  illustrative?: boolean // true ⇒ historical estimate → render the label
  national: { darkMinutes: number; activeQuarters: number }
  hours: HoursRow[]
  voice: VoiceRow[]
}

export interface HoursRow {
  zoneId: string
  name: string
  region: string
  darkMinutes: number
  rankDark: number
  illustrative?: boolean // seed/historical → render the label
}

export interface VoiceRow {
  zoneId: string
  name: string
  region: string
  reporters: number
  confirms: number
  watchDays: number
  rankVoice: number
  illustrative?: boolean
}

export interface Badge {
  key: string
  label: string
  zoneId: string
  earnedWeek?: string
}

/** Flat quarter directory entry from GET /api/go/quarters (centroids for GPS snap + search). */
export interface QuarterDir {
  id: string
  name: string
  regionId: string
  region: string
  lat: number
  lng: number
}
