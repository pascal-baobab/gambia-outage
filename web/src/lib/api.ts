// api.ts — typed client for the custom read-model routes (§3). Reads are public, no auth.
// In dev, Vite proxies /api → http://127.0.0.1:8090 (see vite.config.ts).
import type { Snapshot, Macro, National, QuarterDir, Community, CommunityWeek, Post, ZoneComment, SocialProfile, SocialLink, CommunityLink, Question, Person, ContactRequest, Privacy, LeaderboardRow, LeaderboardResp } from './types'
import type { Profile } from '@/lib/xp'
import { getTurnstileToken } from './turnstile'

const BASE = '/api/go'

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return (await res.json()) as T
}

/** National + 7 macros (Home first paint). */
export const getSnapshot = () => getJSON<Snapshot>('/snapshot')

/** Zone detail + quarters. */
export const getMacro = (id: string) => getJSON<Macro>(`/macro/${encodeURIComponent(id)}`)

/** Share-card / banner numbers. */
export const getNational = () => getJSON<National>('/national')

/** Flat quarter directory (centroids) — for GPS reverse-geocode + typeable search. */
export const getQuarters = () => getJSON<{ quarters: QuarterDir[] }>('/quarters').then((d) => d.quarters)

/** Community — live current-week Wall of Honor (Hours in the Dark + Civic Voice). */
export const getCommunity = () => getJSON<Community>('/community')

/** A frozen weekly board (incl. the illustrative 2026-W22 historical week). */
export const getCommunityWeek = (weekId: string) =>
  getJSON<CommunityWeek>(`/community/week/${encodeURIComponent(weekId)}`)

/** Nearest seeded quarter to a GPS coord (client-side reverse-geocode). Returns null if the
 *  directory is empty. Mirrors the server's snapZone idea so the UI can name the place. */
export function nearestQuarter(quarters: QuarterDir[], lat: number, lng: number): QuarterDir | null {
  const toRad = (x: number) => (x * Math.PI) / 180
  let best: QuarterDir | null = null
  let bestD = Infinity
  for (const q of quarters) {
    const dLat = toRad(q.lat - lat)
    const dLng = toRad(q.lng - lng)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(q.lat)) * Math.sin(dLng / 2) ** 2
    const d = 2 * 6371 * Math.asin(Math.sqrt(a))
    if (d < bestD) { bestD = d; best = q }
  }
  return best
}

// ── Report create (POST /api/collections/reports/records) ───────────────────
// Anonymous append-only create. The hook sets rl_key, merges, rate-limits,
// sanitises and snaps. Requires EITHER a zone (manual pick) OR lat/lng (GPS).
export interface ReportInput {
  type: 'out' | 'back'
  zone?: string
  source: 'gps' | 'manual'
  lat?: number
  lng?: number
  note?: string
  client_uuid?: string
  claim_nonce?: string // anonymous XP capability; minted client-side, never stored on the report row
}

/** Maps backend 400 messages → friendly, neutral copy. */
export function friendlyReportError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('duplicate out') || m.includes('rate window')) return 'You already reported this area recently. Thanks — your report is counted.'
  if (m.includes('duplicate client_uuid') || m.includes('already applied')) return 'This report was already sent.'
  if (m.includes('no zone')) return 'Pick an area or enable location to place your report.'
  if (m.includes('type must be')) return 'Something went wrong with that report. Please try again.'
  return 'Could not send your report. Please try again.'
}

export class ReportError extends Error {
  friendly: string
  constructor(message: string) {
    super(message)
    this.name = 'ReportError'
    this.friendly = friendlyReportError(message)
  }
}

/** Thrown when the POST never reached the server (offline / DNS / tunnel down) — i.e. the
 * fetch itself rejected, as opposed to a server 4xx/5xx. The caller can queue + retry. */
export class NetworkError extends Error {
  constructor(message = 'network unreachable') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** True if the error means the report is already applied server-side (safe to drop on replay). */
export function isDuplicateError(err: unknown): boolean {
  if (err instanceof ReportError) {
    const m = err.message.toLowerCase()
    return m.includes('duplicate client_uuid') || m.includes('already applied')
  }
  return false
}

/**
 * POST a report.
 * - Resolves on 2xx.
 * - Throws `ReportError` (with `.friendly`) on a server rejection (the request reached the
 *   backend and it said no — do NOT queue these, they're deterministic).
 * - Throws `NetworkError` if the request never reached the server (offline) — queue + retry.
 */
export async function createReport(input: ReportInput, turnstileToken?: string | null): Promise<unknown> {
  // anti-bot: the interactive submit (ReportSheet) passes a token from the VISIBLE widget; the
  // outbox flush calls without one → fall back to a hidden-widget token (best-effort). The token
  // is NEVER stored in the outbox (it's single-use and would expire), hence the separate arg.
  const body: Record<string, unknown> = { ...input }
  const token = turnstileToken !== undefined ? turnstileToken : await getTurnstileToken()
  if (token) body.cf_turnstile_token = token
  let res: Response
  try {
    res = await fetch('/api/collections/reports/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // fetch rejects only on a network-level failure (not on HTTP error status)
    throw new NetworkError()
  }
  if (!res.ok) {
    let message = `report failed (${res.status})`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* non-JSON error body */
    }
    throw new ReportError(message)
  }
  return res.json()
}

export interface Stats { contributors: number; reports: number }

// ── Gamification API ─────────────────────────────────────────────────────────
/** Redeem one earned claim_nonce for XP. Returns the updated profile. Throws NetworkError on a
 *  network failure (caller keeps the nonce queued); a server 4xx means the nonce was already
 *  redeemed or never minted → caller drops it. */
export async function claimXp(accountId: string, claimNonce: string): Promise<Profile> {
  let res: Response
  try {
    res = await fetch(`${BASE}/xp/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ account_id: accountId, claim_nonce: claimNonce }),
    })
  } catch {
    throw new NetworkError()
  }
  if (!res.ok) {
    if (res.status >= 500 || res.status === 429) throw new NetworkError() // transient → retry later
    throw new ReportError(`claim failed (${res.status})`) // 4xx deterministic → caller drops the nonce
  }
  return (await res.json()) as Profile
}

export async function fetchProfile(accountId: string): Promise<Profile> {
  const res = await fetch(`${BASE}/profile?account=${encodeURIComponent(accountId)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new ReportError(`profile failed (${res.status})`)
  return (await res.json()) as Profile
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${BASE}/stats`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new ReportError(`stats failed (${res.status})`)
  return (await res.json()) as Stats
}

// ── Community UGC API (persistent pseudonym — never linked to reports) ─────────
async function postJSON<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new NetworkError()
  }
  if (!res.ok) {
    if (res.status >= 500 || res.status === 429) throw new NetworkError()
    let message = `request failed (${res.status})`
    try { const b = (await res.json()) as { message?: string }; if (b?.message) message = b.message } catch { /* */ }
    throw new ReportError(message)
  }
  return (await res.json()) as T
}

export const createPost = (input: { account_id: string; nickname: string; avatar_id: string; body: string; zone?: string | null }) =>
  postJSON<Post>('/posts', input)
export const fetchFeed = (limit = 50) => getJSON<{ posts: Post[] }>(`/feed?limit=${limit}`).then((d) => d.posts)

// ── Zone leaderboard (pseudonym + score only — never linked to reports) ────────
/** Read the ranked board for a zone ('' = All zones) and week (''=current). */
export const fetchLeaderboard = (zone: string, week = '', limit = 50) =>
  getJSON<LeaderboardResp>(`/leaderboard?zone=${encodeURIComponent(zone)}&week=${encodeURIComponent(week)}&limit=${limit}`)
/** Submit a Photo-Crush score. Body is pseudonym + score ONLY — the server stamps the
 *  week authoritatively (never send the week from the client; Pitfall 4 / T-06-04). */
export const submitScore = (input: { account_id: string; nickname: string; avatar_id: string; zone: string; score: number }) =>
  postJSON<LeaderboardRow | LeaderboardResp>('/leaderboard/submit', input)
/** Create a comment against any target: a zone, a social card, a community link, or a question. */
export const createComment = (input: { account_id: string; nickname: string; avatar_id: string; body: string; target_type?: 'zone' | 'social' | 'community_link' | 'question'; target_id?: string; zone?: string }) =>
  postJSON<ZoneComment>('/comments', input)
/** Read comments for any target. */
export const fetchComments = (targetType: 'zone' | 'social' | 'community_link' | 'question', targetId: string, limit = 100) =>
  getJSON<{ comments: ZoneComment[] }>(`/comments?target_type=${targetType}&target_id=${encodeURIComponent(targetId)}&limit=${limit}`).then((d) => d.comments)
/** Back-compat helper for zone discussions. */
export const fetchZoneComments = (zone: string, limit = 100) => fetchComments('zone', zone, limit)

// ── Q&A board ("Talk" tab) — pseudonymous questions; answers are comments(target_type='question') ──
/** Post a Talk board entry. Multipart (so the optional on-device-optimised photo can upload) → the
 *  public records API; the go_qa create hook sanitises, rate-limits, and forces server-owned fields.
 *  Returns the new question already mapped to the read-model shape for an optimistic prepend. */
export async function createQuestion(input: {
  account_id: string; nickname: string; avatar_id: string; title: string; body?: string; zone?: string; image?: File | null
}): Promise<Question> {
  const fd = new FormData()
  fd.set('account_id', input.account_id)
  fd.set('nickname', input.nickname)
  fd.set('avatar_id', input.avatar_id)
  fd.set('title', input.title)
  fd.set('body', input.body ?? '')
  if (input.zone) fd.set('zone', input.zone)
  if (input.image) fd.set('image', input.image)
  const res = await fetch('/api/collections/questions/records', { method: 'POST', body: fd })
  if (!res.ok) {
    let message = 'Could not post — try again.'
    try {
      const b = (await res.json()) as { message?: string; data?: Record<string, { message?: string }> }
      if (b?.message) message = b.message
      if (b?.data) { const f = Object.values(b.data).find((x) => x?.message); if (f?.message) message = f.message }
    } catch { /* */ }
    throw new ReportError(message)
  }
  const r = (await res.json()) as { id: string; nickname?: string; avatar_id?: string; title?: string; body?: string; zone?: string; image?: string; created: string }
  return {
    id: r.id, nickname: r.nickname || '', avatarId: r.avatar_id || '',
    title: r.title || '', body: r.body || '', zone: r.zone || '',
    image: r.image ? `/api/files/questions/${r.id}/${r.image}` : '',
    created: r.created, ago: 'now',
  }
}
export const fetchQuestions = (limit = 50) =>
  getJSON<{ questions: Question[] }>(`/questions?limit=${limit}`).then((d) => d.questions)
/** Edit your own Talk question (author-only; the server checks account_id). Returns the updated shape. */
export const updateQuestion = (input: { account_id: string; id: string; title: string; body?: string; zone?: string }) =>
  postJSON<Question>('/questions/update', input)
/** Delete (soft) your own Talk question (author-only). */
export const deleteQuestion = (input: { account_id: string; id: string }) =>
  postJSON<{ ok: boolean; id: string }>('/questions/delete', input)
export const fetchQuestionThread = (id: string) =>
  getJSON<{ question: Question; answers: ZoneComment[] }>(`/questions/${encodeURIComponent(id)}`)
export const saveIntro = (input: { account_id: string; nickname: string; avatar_id: string; bio: string; home_zone?: string }) =>
  postJSON<SocialProfile>('/profile/intro', input)
export const fetchIntro = (accountId: string) =>
  getJSON<SocialProfile>(`/profile/intro?account=${encodeURIComponent(accountId)}`)

// ── People directory — opt-in neighbour discovery + "wave" requests ──
// Pseudonym-only graph (account_id capability), never linked to reports. People are addressed by
// their public PROFILE RECORD ID; the account_id never leaves the device except as the caller's own.
/** Discoverable neighbours (excludes self + blocked), each carrying the viewer's wave status. */
export const fetchPeople = (accountId: string, limit = 40) =>
  getJSON<{ people: Person[] }>(`/people?account=${encodeURIComponent(accountId)}&limit=${limit}`).then((d) => d.people)
/** Send a "wave" to a person by their public profile id. Idempotent. */
export const sendWave = (accountId: string, toProfileId: string) =>
  postJSON<{ ok: boolean; status: 'pending' | 'accepted' | 'declined' }>('/people/wave', { account_id: accountId, to: toProfileId })
/** The viewer's incoming pending waves + a badge count. */
export const fetchContactRequests = (accountId: string) =>
  getJSON<{ requests: ContactRequest[]; count: number }>(`/people/requests?account=${encodeURIComponent(accountId)}`)
/** Accept or decline an incoming wave (by its connection record id). */
export const respondContactRequest = (accountId: string, requestId: string, action: 'accept' | 'decline') =>
  postJSON<{ ok: boolean; status: string }>('/people/respond', { account_id: accountId, request: requestId, action })
/** Block a person (both directions — they can no longer find or wave you). */
export const blockPerson = (accountId: string, targetProfileId: string) =>
  postJSON<{ ok: boolean }>('/people/block', { account_id: accountId, target: targetProfileId })
/** Update the viewer's own visibility/contact switches. */
export const savePrivacy = (accountId: string, p: Privacy) =>
  postJSON<Privacy>('/people/privacy', { account_id: accountId, discoverable: p.discoverable, accept_requests: p.acceptRequests })

// ── Unique usernames — forced, globally-unique public pseudonym (60-day change cooldown) ──
export type NameReason = 'taken' | 'reserved' | 'invalid' | 'cooldown'
/** Live availability check while typing. `account` lets a user re-check their own current name. */
export const checkName = (name: string, accountId?: string) =>
  getJSON<{ available: boolean; reason?: NameReason; name: string; hasPassword?: boolean }>(
    `/name/check?name=${encodeURIComponent(name)}${accountId ? `&account=${encodeURIComponent(accountId)}` : ''}`,
  )
/** Claim or change the public name. Resolves to ok / business rejection (never throws on taken/cooldown). */
export const claimName = (accountId: string, name: string) =>
  postJSON<{ ok: boolean; name?: string; nextChangeAt?: string; reason?: NameReason; until?: string }>(
    '/name/claim',
    { account_id: accountId, name },
  )

// ── Account recovery (optional, PII-free: name + password) ───────────────────────────────────────
/** Set/replace the recovery password for this account (requires a claimed name). */
export const setAccountPassword = (accountId: string, password: string) =>
  postJSON<{ ok: boolean; reason?: 'invalid' | 'no_name' }>('/account/set-password', { account_id: accountId, password })
/** Whether this account has a recovery password set (drives the Profile UI). */
export const accountStatus = (accountId: string) =>
  getJSON<{ hasPassword: boolean; name: string }>(`/account/status?account=${encodeURIComponent(accountId)}`)
/** Recover an account on a new device by name + password. Returns the account capability + profile bits. */
export const recoverAccount = (name: string, password: string) =>
  postJSON<{ ok: boolean; account_id?: string; name?: string; avatarId?: string; bio?: string; homeZone?: string; nextChangeAt?: string; reason?: 'invalid' | 'locked'; until?: string }>(
    '/account/recover',
    { name, password },
  )

/** Owner-curated external posts ("From Facebook") + active live streams. Read-only; ingested via the
 *  Telegram bot. Returns `lives` (active streams → LIVE strip) and `links` (the From-Facebook cards). */
export const fetchSocial = (limit = 30) =>
  getJSON<{ lives?: SocialLink[]; links: SocialLink[] }>(`/social?limit=${limit}`).then((d) => ({ lives: d.lives ?? [], links: d.links }))

/** Like a "From Facebook" post (anonymous, deduped server-side by daily rl_key). Idempotent. */
export const likeSocial = (id: string) =>
  postJSON<{ id: string; likes: number; liked: boolean }>('/social/like', { id })

// ── Community link submissions ("From the community" / "Dai cittadini") ──────────────────────────
/** User-submitted FB/TikTok links (separate from the curated feed). Read-only list. */
export const fetchCommunityLinks = (limit = 30) =>
  getJSON<{ links: CommunityLink[] }>(`/community-links?limit=${limit}`).then((d) => d.links)

/** Submit a community link. Multipart (cover image upload) → the public records API; the create hook
 *  validates domain/caption/image, enforces the per-device cap + URL dedupe, and forces server fields. */
export async function submitCommunityLink(input: {
  account_id: string; nickname: string; avatar_id: string; url: string; caption: string; image: File
}): Promise<CommunityLink> {
  const fd = new FormData()
  fd.set('account_id', input.account_id)
  fd.set('nickname', input.nickname)
  fd.set('avatar_id', input.avatar_id)
  fd.set('url', input.url)
  fd.set('caption', input.caption)
  fd.set('image', input.image)
  const res = await fetch('/api/collections/community_links/records', { method: 'POST', body: fd })
  if (!res.ok) {
    let message = 'Could not publish — try again.'
    try {
      const b = (await res.json()) as { message?: string; data?: Record<string, { message?: string }> }
      if (b?.message) message = b.message
      // surface the first field-level validation message (e.g. missing image) if present
      if (b?.data) { const f = Object.values(b.data).find((x) => x?.message); if (f?.message) message = f.message }
    } catch { /* */ }
    throw new ReportError(message)
  }
  return (await res.json()) as CommunityLink
}

/** Like a community link (anonymous, daily rl_key dedupe). Idempotent. */
export const likeCommunityLink = (id: string) =>
  postJSON<{ id: string; likes: number; liked: boolean }>('/community-links/like', { id })

/** Report a community link as abusive (anonymous, daily rl_key dedupe). Auto-hides at the floor. */
export const reportCommunityLink = (id: string) =>
  postJSON<{ id: string; hidden: boolean }>('/community-links/report', { id })

export interface AmbassadorEntry {
  id: string
  name: string | null
  avatarId: string | null
  ambassadorSince: string
}

export const fetchAmbassadors = () =>
  getJSON<{ ambassadors: AmbassadorEntry[] }>('/ambassadors').then((d) => d.ambassadors)
