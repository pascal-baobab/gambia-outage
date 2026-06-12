// lib/go.js — shared Phase 1 backend logic (CommonJS). REQUIRE THIS INSIDE each handler:
//   const go = require(`${__hooks}/lib/go.js`)
// because Pocketbase JSVM handlers run in an isolated runtime and can't see file scope.
// Runtime globals ($app, $security, $os, DateTime, Record) ARE available here.

// ── config (env with §4.8 defaults) ────────────────────────────────────────
function env(name, def) {
  const v = $os.getenv(name)
  return v === '' || v === undefined || v === null ? def : v
}
const CFG = {
  CONFIRM_THRESHOLD: parseInt(env('CONFIRM_THRESHOLD', '8'), 10),
  RL_OUT_WINDOW_MIN: parseInt(env('RL_OUT_WINDOW_MIN', '10'), 10),
  RL_HOURLY: parseInt(env('RL_HOURLY', '30'), 10),
  SNAP_RADIUS_KM: parseFloat(env('SNAP_RADIUS_KM', '3')),
  AUTOCLOSE_IDLE_HOURS: parseInt(env('AUTOCLOSE_IDLE_HOURS', '6'), 10),
  MAX_EVENT_HOURS: parseInt(env('MAX_EVENT_HOURS', '24'), 10),
  NOTE_MAX: parseInt(env('NOTE_MAX', '140'), 10),
  // Distinct-reporter floor to close an open event via 'back' signals (P0-3a Sybil-resistance).
  // Tunable: lowered to 2 in prod during launch (sparse adoption — a real restore reported by one
  // person plus one corroboration shouldn't stay stuck out). Long-term credible value is 3.
  BACK_CLOSE_FLOOR: parseInt(env('BACK_CLOSE_FLOOR', '3'), 10),
  // P0 Sybil hardening (2026-06-07 audit): rl_key embeds the attacker-controlled UA, so one IP
  // rotating User-Agents mints unlimited "distinct reporters". ip_key (salted-hashed IP, daily
  // rotation, reports-only) re-anchors trust to the network layer:
  //  - RL_IP_HOURLY     — max reports/hour from ONE IP regardless of how many UAs it rotates.
  //  - IP_DEVICE_MULT   — distinct-reporter counts are capped at distinctIPs × this multiplier
  //                       (a household / CGNAT egress legitimately carries a few devices).
  //  - BACK_CLOSE_IP_FLOOR — closing an event via 'back' needs at least this many distinct IPs,
  //                       so a single IP can NEVER suppress a real outage (auto-close remains
  //                       the backstop for genuinely-restored zones).
  RL_IP_HOURLY: parseInt(env('RL_IP_HOURLY', '90'), 10),
  IP_DEVICE_MULT: parseInt(env('IP_DEVICE_MULT', '3'), 10),
  BACK_CLOSE_IP_FLOOR: parseInt(env('BACK_CLOSE_IP_FLOOR', '2'), 10),
  // Display-flip floor (2026-06-12): flipping a STILL-OPEN outage's bulb to LIGHT contradicts the
  // active OUT evidence, so it needs corroboration — this many DISTINCT 'back' reporters (60-min
  // window, Sybil-capped) before last_signal_type flips to 'back'. Closing keeps its own stricter
  // thresholds (BACK_CLOSE_FLOOR + IP floor). Set to 1 to restore the old single-back re-light.
  BACK_DISPLAY_FLOOR: parseInt(env('BACK_DISPLAY_FLOOR', '2'), 10),
  // Peak distinct-reporter floor for an event to count toward the community "Hours in the Dark"
  // board (anti-gaming). Defaults to CONFIRM_THRESHOLD (8); lowered to 3 in prod during launch so
  // real-but-sparse outages produce REAL hours instead of a misleading 0h00m. Never fabricated —
  // still requires multiple distinct reporters. Revert to 8 post-launch via /root/.env.
  COMMUNITY_CONFIRM_FLOOR: parseInt(env('COMMUNITY_CONFIRM_FLOOR', '8'), 10),
  // Community UGC per-account hourly caps (moderation = automatic only; these + sanitise +
  // length caps are the floor against spam, since there is no flag queue).
  POST_HOURLY: parseInt(env('POST_HOURLY', '10'), 10),
  COMMENT_HOURLY: parseInt(env('COMMENT_HOURLY', '30'), 10),
  QUESTION_HOURLY: parseInt(env('QUESTION_HOURLY', '10'), 10),
  // Estimated baseline: The Gambia is under sustained NAWEC load-shedding (~12h/day). A macro/quarter
  // with NO open event AND zero reports today is presented as a clearly-labelled ESTIMATE at this
  // daily average — never a confirmed claim. The MOMENT a real report (out/back) lands, that zone's
  // real status overrides the estimate (reports are the gold). DISPLAY/read-model only — no fabricated
  // events or reports rows, so the trust pipeline (confirms/Sybil close/community board) stays 100% real.
  BASELINE_ENABLED: env('BASELINE_ENABLED', 'true') !== 'false',
  BASELINE_DAILY_MIN: parseInt(env('BASELINE_DAILY_MIN', '720'), 10),
  // Community link submissions ("Dai cittadini"): per-device hourly cap, distinct-reporter floor to
  // auto-hide an abusive card, and the caption length cap.
  COMMUNITY_LINK_HOURLY: parseInt(env('COMMUNITY_LINK_HOURLY', '5'), 10),
  COMMUNITY_LINK_REPORT_FLOOR: parseInt(env('COMMUNITY_LINK_REPORT_FLOOR', '3'), 10),
  COMMUNITY_LINK_CAPTION_MAX: parseInt(env('COMMUNITY_LINK_CAPTION_MAX', '200'), 10),
  // Anti-squatting: a claimed unique name is auto-released after this many days of total account
  // inactivity (no password, no XP, no social/People footprint). Frees desirable names taken by
  // drive-by users who never engaged. 0 disables the GC entirely. See releaseInactiveNames().
  NAME_INACTIVE_DAYS: parseInt(env('NAME_INACTIVE_DAYS', '7'), 10),
  // Geo-gate: outage reports may only come from inside The Gambia (owner: a report from Senegal or
  // Italy must not be possible). Country is read from Cloudflare's CF-IPCountry header (the tunnel
  // forwards it, same as CF-Connecting-IP). Default ON; override GEO_GATE=false in /root/.env to
  // disable. GEO_ALLOW is a comma-separated ISO-3166-1 allowlist (default just GM). Fail-OPEN when the
  // country is unknown/empty (dev/local with no CF header, or Tor 'T1'/CF 'XX') so local tooling +
  // the seed keep working — in prod the only ingress is the CF tunnel, which always sets it.
  GEO_GATE: env('GEO_GATE', 'true') !== 'false',
  GEO_ALLOW: env('GEO_ALLOW', 'GM'),
}

// True if a report from this ISO country code is permitted. Gate off → always true. Unknown country
// (empty / 'XX' / 'T1') → true (fail open). Otherwise must be in the GEO_ALLOW allowlist.
function geoAllowed(country) {
  if (!CFG.GEO_GATE) return true
  const c = String(country || '').toUpperCase().trim()
  if (!c || c === 'XX' || c === 'T1') return true
  return CFG.GEO_ALLOW.toUpperCase().split(',').map((s) => s.trim()).filter(Boolean).indexOf(c) >= 0
}
// Pull the Cloudflare country code out of a PB requestInfo() headers object (keys are lowercased;
// underscore and dash forms both seen across PB versions).
function geoCountryFromHeaders(headers) {
  if (!headers) return ''
  return String(headers.cf_ipcountry || headers['cf-ipcountry'] || headers['Cf-Ipcountry'] || '').toUpperCase().trim()
}

// ── time helpers (Africa/Banjul = UTC+0, no DST) ────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }
function pbTime(d) {
  // PB stored format: "YYYY-MM-DD HH:MM:SS.sssZ" (fixed width → lexicographic-safe)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(d.getUTCMilliseconds()).padStart(3, '0')}Z`
  )
}
function minutesAgo(min) { return new Date(Date.now() - min * 60000) }
function midnightUTC() {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}
function dayStr(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` }
function parsePB(s) {
  // "2026-05-31 13:37:18.264Z" → Date
  if (!s) return null
  return new Date(String(s).replace(' ', 'T'))
}

// ── geo ─────────────────────────────────────────────────────────────────────
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Read a property out of a PB JSON field. JSON fields come back as types.JSONRaw (string-like):
// direct property access returns undefined (or a NATIVE string method — `.at`!), so always parse the
// string form first. Discovered 2026-06-10: `.get('data').salt` silently returned undefined → the
// daily rl_key salt NEVER actually rotated (the hash always used the literal "undefined" suffix).
function jsonField(record, field, prop) {
  const raw = record.get(field)
  try {
    const v = JSON.parse(String(raw))[prop]
    if (v !== undefined) return v
  } catch (_) {}
  const direct = raw && raw[prop]
  return typeof direct === 'function' ? undefined : direct
}

// ── identity (anonymous) ────────────────────────────────────────────────────
function dailySalt(app) {
  // stored in read_models key 'config:daily_salt' so the daily cron can rotate it.
  try {
    const salt = jsonField(app.findFirstRecordByFilter('read_models', "key = 'config:daily_salt'"), 'data', 'salt')
    if (typeof salt === 'string' && salt) return salt
    throw new Error('no salt')
  } catch (_) {
    const salt = env('DAILY_SALT', $security.randomString(24))
    writeReadModel(app, 'config:daily_salt', { salt })
    return salt
  }
}
function rlKey(app, realIP, ua) {
  return $security.sha256((realIP || 'dev-local') + String(ua || '').slice(0, 40) + dailySalt(app))
}
// Network-layer twin of rlKey WITHOUT the attacker-controlled UA: same daily salt rotation, same
// anonymity class, stored only on the non-public reports rows. Basis of the Sybil caps in
// distinctReporters60m / rateLimitReason / mergeBack.
function ipKey(app, realIP) {
  return $security.sha256('ip:' + (realIP || 'dev-local') + dailySalt(app))
}

// ── text sanitise (P1-5: strip HTML/URL/email/phone + mask a blocklist + collapse + cap) ─────
// Generalised so the community UGC layer (posts/comments/bio) reuses the SAME PII + profanity
// floor as report notes. sanitiseNote is the note-capped specialisation.
function sanitiseText(s, max) {
  if (!s) return ''
  let t = String(s)
    .replace(/<[^>]*>/g, ' ')                                        // strip HTML tags
    .replace(/(?:https?:\/\/|www\.)\S+/gi, ' ')                      // strip URLs
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, ' ') // strip emails
    .replace(/\+?\d[\d\s().-]{5,}\d/g, ' ')                          // strip phone-like digit runs (≥7 digits → catches 7-digit Gambian numbers)
  // mask a small set of unambiguous slurs/obscenities (case-insensitive; extend with care).
  // English-first: the public feed is brand-facing, so this is a floor — not a complete filter.
  const BLOCK = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dickhead',
    'motherfucker', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut',
  ]
  for (let i = 0; i < BLOCK.length; i++) {
    t = t.replace(new RegExp('\\b' + BLOCK[i] + '\\w*', 'gi'), '***')
  }
  return t.replace(/\s+/g, ' ').trim().slice(0, max || CFG.NOTE_MAX)
}
function sanitiseNote(s) { return sanitiseText(s, CFG.NOTE_MAX) }

// ── Turnstile (Phase B: anti-bot on the report POST) ────────────────────────
// Verify a Cloudflare Turnstile token via siteverify. Returns true when DISABLED (no secret —
// dev/local/test) so the pipeline stays usable; when enabled, returns true only for a valid
// token and FAILS CLOSED on a missing/invalid token or a verify error. PB JSVM does HTTP via
// $http.send. Secret + site key live in /root/.env (never committed).
function turnstileEnabled() { return env('TURNSTILE_SECRET', '') !== '' }
function verifyTurnstile(app, token, remoteIP) {
  const secret = env('TURNSTILE_SECRET', '')
  if (!secret) return true // disabled → accept (dev/local)
  if (!token) return false
  try {
    let body = 'secret=' + encodeURIComponent(secret) + '&response=' + encodeURIComponent(token)
    if (remoteIP) body += '&remoteip=' + encodeURIComponent(remoteIP)
    const res = $http.send({
      method: 'POST',
      url: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body,
      timeout: 8,
    })
    const json = res.json || {}
    return json.success === true
  } catch (e) {
    app.logger().warn('turnstile verify error (failing closed)', 'err', String(e))
    return false
  }
}

// ── queries ─────────────────────────────────────────────────────────────────
function openEvent(app, zoneId) {
  try {
    return app.findFirstRecordByFilter('events', "zone = {:z} && status = 'open'", { z: zoneId })
  } catch (_) {
    return null
  }
}
// Distinct-reporter signal for a zone/type in the last 60 min, Sybil-capped at the network layer:
// the raw distinct-rl_key count is capped at distinctIPs × IP_DEVICE_MULT, because rl_key embeds
// the attacker-controlled UA (one IP rotating UAs otherwise mints unlimited "reporters") while a
// real household/CGNAT egress only carries a few devices. Legacy rows without ip_key (pre-migration
// — the window is 60 min, so only the first hour after deploy) fall back to their rl_key as the IP
// bucket, never undercounting real reporters to zero. Returns { distinct, ips }.
function distinctReporters60m(app, zoneId, type) {
  const rows = app.findRecordsByFilter(
    'reports',
    'zone = {:z} && type = {:t} && hidden = false && created >= {:since}',
    '-created', 2000, 0,
    { z: zoneId, t: type, since: pbTime(minutesAgo(60)) },
  )
  const rl = {}, ip = {}
  rows.forEach((r) => {
    rl[r.get('rl_key')] = 1
    ip[r.get('ip_key') || 'legacy:' + r.get('rl_key')] = 1
  })
  const ips = Object.keys(ip).length
  return { distinct: Math.min(Object.keys(rl).length, ips * CFG.IP_DEVICE_MULT), ips }
}
function distinctOut60m(app, zoneId) { return distinctReporters60m(app, zoneId, 'out').distinct }
// distinct 'back' reporters in the last 60 min (P0-3a: Sybil-resistant restore signal — one
// device can't fabricate a "power back" to suppress a real, still-dark outage).
function distinctBack60m(app, zoneId) { return distinctReporters60m(app, zoneId, 'back').distinct }
function countReports(app, filter, params) {
  return app.findRecordsByFilter('reports', filter, '', 5000, 0, params).length
}

// ── point-in-polygon (region boundary fallback) ─────────────────────────────
// Ray-casting on a single ring of [lng, lat] vertices.
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
    if (((yi > lat) !== (yj > lat)) && lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside
  }
  return inside
}
// True if (lat,lng) is inside a region zone's real MultiPolygon boundary (bbox-gated). The geojson
// field is a goja-wrapped Go value → stringify+parse once to get plain JS arrays for indexing.
function regionContains(z, lat, lng) {
  let bb = z.get('bbox')
  try { bb = JSON.parse(JSON.stringify(bb)) } catch (e) { bb = null }
  if (bb && bb.length === 4 && (lng < bb[0] || lng > bb[2] || lat < bb[1] || lat > bb[3])) return false
  let gj = z.get('geojson')
  try { gj = JSON.parse(JSON.stringify(gj)) } catch (e) { return false }
  if (!gj || !gj.coordinates) return false
  for (let p = 0; p < gj.coordinates.length; p++) {
    const outer = gj.coordinates[p][0]
    if (outer && pointInRing(lng, lat, outer)) return true
  }
  return false
}

// ── snap (GPS → nearest real settlement ≤ radius, else region by boundary, else nearest region) ──
// Quarter centroids are now real coordinates, so the nearest one within SNAP_RADIUS_KM is the correct
// quarter (resolves both the settlement AND its macro). Only when a point is far from every seeded
// settlement (rural gaps) do we fall back to point-in-polygon against the real region boundaries.
function snapZone(app, lat, lng) {
  const zones = app.findRecordsByFilter('zones', "lat != '' && lng != ''", '', 1000, 0)
  let bestSet = null, bestSetD = Infinity, bestReg = null, bestRegD = Infinity
  const regions = []
  zones.forEach((z) => {
    const lvl = z.get('level')
    const d = haversineKm(lat, lng, z.get('lat'), z.get('lng'))
    if (lvl === 'settlement') { if (d < bestSetD) { bestSetD = d; bestSet = z } }
    else if (lvl === 'region') { if (d < bestRegD) { bestRegD = d; bestReg = z }; regions.push(z) }
  })
  if (bestSet && bestSetD <= CFG.SNAP_RADIUS_KM) return bestSet.id
  for (let i = 0; i < regions.length; i++) {
    if (regionContains(regions[i], lat, lng)) return regions[i].id
  }
  return bestReg ? bestReg.id : null
}

// ── merge (§4.3) ────────────────────────────────────────────────────────────
function mergeOut(app, zoneId) {
  const now = new Date()
  let ev = openEvent(app, zoneId)
  if (!ev) {
    const col = app.findCollectionByNameOrId('events')
    ev = new Record(col)
    ev.set('zone', zoneId)
    ev.set('status', 'open')
    ev.set('started_at', pbTime(now))
    ev.set('out_confirmations', 1)
    ev.set('back_confirmations', 0)
    ev.set('last_activity_at', pbTime(now))
    ev.set('distinct_out_60m', 0)
    ev.set('peak_concurrent', 0)
    ev.set('auto_closed', false)
    try {
      app.save(ev)
    } catch (err) {
      // Lost the create race: the idx_events_one_open unique index rejected this insert because a
      // concurrent OUT just opened the event. Re-fetch the winner and increment it, so this OUT
      // still counts instead of being dropped on the floor.
      ev = openEvent(app, zoneId)
      if (!ev) throw err
      ev.set('out_confirmations', (ev.get('out_confirmations') || 0) + 1)
      ev.set('last_activity_at', pbTime(now))
      app.save(ev)
    }
  } else {
    ev.set('out_confirmations', (ev.get('out_confirmations') || 0) + 1)
    ev.set('last_activity_at', pbTime(now))
    app.save(ev)
  }
  ev.set('last_signal_type', 'out')
  ev.set('last_signal_at', pbTime(now))
  app.save(ev)
  // recompute distinct + peak AFTER the report row is committed by the caller (we recompute in recompute()).
  return ev
}
function mergeBack(app, zoneId) {
  const ev = openEvent(app, zoneId)
  if (!ev) return null
  const now = new Date()
  // P0-3a: count DISTINCT rl_key 'back' reports in the window (the report row is already
  // committed by the caller, post e.next()). This replaces the old raw per-POST counter that
  // let a single device close a confirmed outage.
  const backSig = distinctReporters60m(app, zoneId, 'back')
  const back = backSig.distinct
  ev.set('back_confirmations', back)
  ev.set('last_activity_at', pbTime(now))
  // Display-flip gate (2026-06-12): a single 'back' must NOT re-light the public bulb while the
  // outage is still open — one mistaken/malicious device was overriding 20 live OUT confirms via
  // SINGLE_REPORT_TRUTH (lastSignal wins on the client). Flip only at BACK_DISPLAY_FLOOR distinct
  // reporters (Sybil-capped); below it the event keeps its 'out' signal while backs accumulate.
  if (back >= CFG.BACK_DISPLAY_FLOOR) {
    ev.set('last_signal_type', 'back')
    ev.set('last_signal_at', pbTime(now))
  }
  const peak = ev.get('peak_concurrent') || 0
  // close only when a clear share of DISTINCT reporters confirm restore (floor = BACK_CLOSE_FLOOR)
  // — so one device alone can never close an outage that's still dark for everyone else. The IP
  // floor additionally requires the restore signal to come from ≥ BACK_CLOSE_IP_FLOOR distinct
  // networks, so a single IP rotating UAs can never suppress a real outage (auto-close backstops
  // genuinely-restored zones either way).
  const threshold = Math.max(CFG.BACK_CLOSE_FLOOR, Math.ceil(0.5 * peak))
  if (back >= threshold && backSig.ips >= CFG.BACK_CLOSE_IP_FLOOR) {
    ev.set('status', 'closed')
    ev.set('ended_at', pbTime(now))
    ev.set('auto_closed', false)
    app.save(ev)
    writeDailyStat(app, zoneId, ev)
  } else {
    app.save(ev)
  }
  return ev
}
function refreshEventConfidence(app, ev) {
  const d = distinctOut60m(app, ev.get('zone'))
  ev.set('distinct_out_60m', d)
  ev.set('peak_concurrent', Math.max(ev.get('peak_concurrent') || 0, d))
  app.save(ev)
  return d
}

// ── daily stats ─────────────────────────────────────────────────────────────
function eventMinutes(ev) {
  const s = parsePB(ev.getString('started_at')), e = parsePB(ev.getString('ended_at')) || new Date()
  if (!s) return 0
  return Math.max(0, Math.round((e - s) / 60000))
}
function writeDailyStat(app, zoneId, ev) {
  const date = dayStr(new Date())
  const mins = eventMinutes(ev)
  let row
  try {
    row = app.findFirstRecordByFilter('zone_daily_stats', 'zone = {:z} && date = {:d}', { z: zoneId, d: date })
  } catch (_) {
    row = new Record(app.findCollectionByNameOrId('zone_daily_stats'))
    row.set('zone', zoneId); row.set('date', date)
    row.set('outage_minutes', 0); row.set('event_count', 0); row.set('max_event_minutes', 0)
  }
  row.set('outage_minutes', (row.get('outage_minutes') || 0) + mins)
  row.set('event_count', (row.get('event_count') || 0) + 1)
  row.set('max_event_minutes', Math.max(row.get('max_event_minutes') || 0, mins))
  app.save(row)
}

// ── derivation (§4.5) ───────────────────────────────────────────────────────
function todayMin(app, zoneId) {
  const mid = midnightUTC()
  let total = 0
  // closed events that ended today
  const closed = app.findRecordsByFilter(
    'events', "zone = {:z} && status = 'closed' && ended_at >= {:mid}", '-ended_at', 500, 0,
    { z: zoneId, mid: pbTime(mid) },
  )
  closed.forEach((ev) => {
    const s = parsePB(ev.get('started_at')), e = parsePB(ev.get('ended_at'))
    if (e) total += Math.max(0, Math.round((e - Math.max(s, mid)) / 60000))
  })
  const open = openEvent(app, zoneId)
  if (open) {
    const s = parsePB(open.get('started_at'))
    total += Math.max(0, Math.round((Date.now() - Math.max(s, mid)) / 60000))
  }
  return total
}
function scaleSev(lo, hi, mins) {
  const f = Math.max(0, Math.min(1, mins / 720)) // 12h saturates the band
  return +(lo + (hi - lo) * f).toFixed(3)
}
// "HH:MM" when the moment is today (UTC = Banjul), else the feed-style "DD Mon · HH:MM" — same
// display-shaped string convention as NoteItem.at, consumed verbatim by the client.
function sinceLabel(d) {
  if (!d) return null
  return d.getTime() >= midnightUTC().getTime() ? clock(d) : feedStamp(d)
}
// Closure truth for a zone with NO open event (display-honesty layer, 2026-06-12). The latest
// event CLOSED today decides whether 'on' is a real claim:
//  - community-confirmed close (auto_closed=false) → light back since ended_at;
//  - auto-close (idle/max-hours timeout) → NO evidence power returned. Unless a 'back' report
//    landed AFTER the close (positive restore evidence on a quiet zone — nothing open left to
//    contradict, so one report suffices, same trust as any quiet-zone signal), the zone is
//    staleClose and the client renders 'nodata' ("Awaiting reports") instead of a lit bulb.
function closureInfo(app, zoneId) {
  let rows = []
  try {
    rows = app.findRecordsByFilter('events', "zone = {:z} && status = 'closed' && ended_at >= {:mid}", '-ended_at', 1, 0, { z: zoneId, mid: pbTime(midnightUTC()) })
  } catch (_) {}
  if (!rows.length) return { staleClose: false, since: null }
  const ev = rows[0]
  const ended = parsePB(ev.get('ended_at'))
  if (!ev.get('auto_closed')) return { staleClose: false, since: sinceLabel(ended) }
  // One-tap-truth (owner directive 2026-06-12): an auto-closed event whose FINAL signal was 'back'
  // is restore evidence, not staleness — someone tapped "power back" and nobody contradicted them
  // for the whole idle window. Only an auto-close that dies on an unanswered OUT goes grey.
  if ((ev.get('last_signal_type') || 'out') === 'back') {
    const flip = parsePB(ev.get('last_signal_at')) || ended
    return { staleClose: false, since: sinceLabel(flip) }
  }
  let backs = []
  try {
    backs = app.findRecordsByFilter('reports', "zone = {:z} && type = 'back' && hidden = false && created >= {:e}", 'created', 1, 0, { z: zoneId, e: pbTime(ended) })
  } catch (_) {}
  if (backs.length) return { staleClose: false, since: sinceLabel(parsePB(backs[0].getString('created'))) }
  return { staleClose: true, since: null }
}
// Leaf derivation: a single zone's status from its OWN open event (used for quarters/settlements).
function deriveZone(app, zoneId) {
  const open = openEvent(app, zoneId)
  const confirms = open ? open.get('distinct_out_60m') || 0 : 0
  const confirmed = confirms >= CFG.CONFIRM_THRESHOLD
  const tMin = todayMin(app, zoneId)
  const reports = countReports(app, "zone = {:z} && hidden = false && created >= {:mid}", { z: zoneId, mid: pbTime(midnightUTC()) })
  let status = 'on', sev = 0.16
  let since = null, staleClose = false
  if (open) {
    const fresh = (Date.now() - parsePB(open.get('last_activity_at'))) < 60 * 60000
    if (confirmed && fresh) { status = 'out'; sev = scaleSev(0.66, 0.95, tMin) }
    else { status = 'partial'; sev = scaleSev(0.4, 0.62, tMin) }
    // `since` = the moment of the CURRENTLY CLAIMED state, not blindly the event start: an open
    // event whose display already flipped to 'back' must caption "back since <the back flip>",
    // not "back since <when the outage began>" (the started_at would date the LIGHT with the
    // DARK's birth time). Legacy events without last_signal_at fall back to started_at.
    const sig = open.get('last_signal_type') || 'out'
    since = sinceLabel(parsePB((sig === 'back' && open.get('last_signal_at')) || open.get('started_at')))
  }
  // Estimated baseline (no open event + no reports today): present the known NAWEC load-shedding
  // average as a labelled ESTIMATE. A real report overrides it (the `if (open)` / reports paths above).
  if (!open && reports === 0 && CFG.BASELINE_ENABLED) {
    return { status: 'estimated', sev: 0.5, confirms: 0, confirmed: false, todayMin: CFG.BASELINE_DAILY_MIN, reports: 0, estimated: true, staleClose: false, since: null, lastSignal: null }
  }
  if (!open) {
    // No open event: 'on' is only an honest claim with restore evidence — see closureInfo.
    const ci = closureInfo(app, zoneId)
    staleClose = ci.staleClose
    since = ci.since // light back since (community close or post-close back report)
  }
  return { status, sev, confirms, confirmed, todayMin: tMin, reports, staleClose, since, lastSignal: open ? (open.get('last_signal_type') || 'out') : null }
}

// Region rollup: a macro's status aggregates its OWN direct event PLUS all of its child
// quarters' open events. GPS reports snap to the nearest quarter (≤ SNAP_RADIUS_KM), so a
// region with no direct event but an out quarter must still read as out on the map/national —
// otherwise GPS-reported outages are invisible (the bug this fixes).
// HYBRID confirmed rule (decision 2026-06-01): confirmed if ANY single child reaches
// CONFIRM_THRESHOLD (8 — a localised hotspot) OR the region-wide sum of distinct confirms
// reaches REGION_CONFIRM_SUM (15 — a diffuse outage across several quarters).
function regionConfirmSum() { return parseInt(env('REGION_CONFIRM_SUM', '15'), 10) }
function deriveMacro(app, regionId) {
  const children = app.findRecordsByFilter('zones', "level = 'settlement' && parent = {:p}", '', 2000, 0, { p: regionId })
  const zoneIds = [regionId].concat(children.map((z) => z.id))
  const since24h = pbTime(new Date(Date.now() - 86400000)) // rolling last-24h window for reports24h
  let maxConfirms = 0, sumConfirms = 0, anyOpen = false, anyFresh = false, maxMin = 0, reports = 0, reports24h = 0, anyOutSignal = false
  let earliestOpenStart = null, latestBackAt = null
  zoneIds.forEach((zid) => {
    const tMin = todayMin(app, zid)
    if (tMin > maxMin) maxMin = tMin
    reports += countReports(app, "zone = {:z} && hidden = false && created >= {:mid}", { z: zid, mid: pbTime(midnightUTC()) })
    reports24h += countReports(app, "zone = {:z} && hidden = false && created >= {:since}", { z: zid, since: since24h })
    const open = openEvent(app, zid)
    if (open) {
      anyOpen = true
      const c = open.get('distinct_out_60m') || 0
      if (c > maxConfirms) maxConfirms = c
      sumConfirms += c
      if ((Date.now() - parsePB(open.get('last_activity_at'))) < 60 * 60000) anyFresh = true
      // Macro lastSignal: DARK if ANY open child is still 'out' (legacy null ⇒ treat as out);
      // only LIGHT ('back') when EVERY open child has reported power back. ("dark if any quarter dark")
      if ((open.get('last_signal_type') || 'out') !== 'back') anyOutSignal = true
      const s = parsePB(open.get('started_at'))
      if (s && (!earliestOpenStart || s.getTime() < earliestOpenStart.getTime())) earliestOpenStart = s
      const b = parsePB(open.get('last_signal_at'))
      if (b && (!latestBackAt || b.getTime() > latestBackAt.getTime())) latestBackAt = b
    }
  })
  const confirmed = maxConfirms >= CFG.CONFIRM_THRESHOLD || sumConfirms >= regionConfirmSum()
  let status = 'on', sev = 0.16
  if (anyOpen) {
    if (confirmed && anyFresh) { status = 'out'; sev = scaleSev(0.66, 0.95, maxMin) }
    else { status = 'partial'; sev = scaleSev(0.4, 0.62, maxMin) }
  }
  // Estimated baseline (no open event anywhere in the region + no reports today): present the known
  // NAWEC load-shedding average as a labelled ESTIMATE. Any real report in the region overrides it.
  if (!anyOpen && reports === 0 && CFG.BASELINE_ENABLED) {
    return { status: 'estimated', sev: 0.5, confirms: 0, confirmed: false, todayMin: CFG.BASELINE_DAILY_MIN, reports: 0, reports24h, sumConfirms: 0, estimated: true, staleClose: false, since: null, lastSignal: null }
  }
  // Display-honesty rollup: with no open event anywhere, the region may only claim 'on' if no
  // member zone sits in a stale auto-close (timeout without restore evidence) — else the client
  // renders 'nodata'. `since` = oldest open start (dark since) while any outage is open.
  let staleClose = false, since = null
  if (anyOpen) {
    // Same claimed-state rule as deriveZone: a region whose every open child reads 'back' (lit)
    // is captioned with the latest back flip, not with the oldest outage start.
    since = sinceLabel(anyOutSignal ? earliestOpenStart : (latestBackAt || earliestOpenStart))
  } else if (reports > 0) {
    for (let i = 0; i < zoneIds.length; i++) {
      if (closureInfo(app, zoneIds[i]).staleClose) { staleClose = true; break }
    }
  }
  // expose the strongest single-quarter confirm count (what "Verified by N" should read);
  // sumConfirms drives the diffuse path but maxConfirms is the honest headline number.
  // reports24h = rolling last-24h report count for the region (what the owner asked the strip to show).
  return { status, sev, confirms: maxConfirms, confirmed, todayMin: maxMin, reports, reports24h, sumConfirms, staleClose, since, lastSignal: anyOpen ? (anyOutSignal ? 'out' : 'back') : null }
}

// ── read-model builders (shapes = §3) ───────────────────────────────────────
function weekFor(app, zoneId, tMin) {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(midnightUTC().getTime() - i * 86400000)
    if (i === 0) { out.push(+(tMin / 60).toFixed(1)); continue }
    try {
      const row = app.findFirstRecordByFilter('zone_daily_stats', 'zone = {:z} && date = {:d}', { z: zoneId, d: dayStr(d) })
      out.push(+((row.get('outage_minutes') || 0) / 60).toFixed(1))
    } catch (_) {
      // No measured stat for that day → fall back to the estimated daily baseline (NAWEC load-shedding
      // average), so the 7-day history reflects the known reality instead of a discouraging flat 0.
      out.push(CFG.BASELINE_ENABLED ? +(CFG.BASELINE_DAILY_MIN / 60).toFixed(1) : 0)
    }
  }
  return out
}
function hm(min) { return { hours: Math.floor(min / 60), mins: Math.round(min % 60) } }
function fmtHM(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return `${h}h ${String(m).padStart(2, '0')}m` }
function clock(d) { return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }

function eventsFor(app, zoneId) {
  const evs = app.findRecordsByFilter('events', 'zone = {:z}', '-started_at', 6, 0, { z: zoneId })
  return evs.map((ev) => {
    const open = ev.get('status') === 'open'
    const s = parsePB(ev.get('started_at')), e = open ? new Date() : parsePB(ev.get('ended_at'))
    return { from: clock(s), to: open ? 'now' : clock(e), dur: fmtHM(eventMinutes(ev)), open }
  })
}
// Region timeline MUST aggregate its quarters (2026-06-12): GPS reports snap to quarters, so the
// region's own zone id rarely carries events — querying only it rendered an empty "Recent events"
// for everyone (and quarters reused that empty list). zoneIds[0] = the region itself; rows from a
// child zone carry `where` (quarter name) so the aggregated timeline says which neighbourhood.
function eventsForMany(app, zoneIds) {
  const inList = zoneIds.map((id) => `zone = '${id}'`).join(' || ') // ids are our own slugs, not user input
  let evs = []
  try { evs = app.findRecordsByFilter('events', `(${inList})`, '-started_at', 6, 0) } catch (_) {}
  const names = {}
  return evs.map((ev) => {
    const open = ev.get('status') === 'open'
    const s = parsePB(ev.get('started_at')), e = open ? new Date() : parsePB(ev.get('ended_at'))
    const zid = ev.get('zone')
    if (!(zid in names)) { try { names[zid] = app.findRecordById('zones', zid).get('name') || '' } catch (_) { names[zid] = '' } }
    const row = { from: clock(s), to: open ? 'now' : clock(e), dur: fmtHM(eventMinutes(ev)), open }
    if (zid !== zoneIds[0] && names[zid]) row.where = names[zid]
    return row
  })
}
// Absolute timestamp for the community feed: "DD Mon · HH:MM" (Africa/Banjul = UTC+0).
function feedStamp(d) {
  if (!d) return ''
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${mon[d.getUTCMonth()]} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
function noteRow(app, r) {
  const created = parsePB(r.getString('created'))
  const mins = created ? Math.max(0, Math.round((Date.now() - created) / 60000)) : 0
  const rel = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
  let where = ''
  try { where = app.findRecordById('zones', r.get('zone')).get('name') } catch (_) {}
  return { t: rel, at: feedStamp(created), text: r.get('note'), where }
}
// Per-zone feed. For a region, includes notes from the region itself AND its child quarters
// (the whole community), newest first. For a quarter, just that quarter's notes.
function notesFor(app, zoneId) {
  let zoneIds = [zoneId]
  try {
    const z = app.findRecordById('zones', zoneId)
    if (z.get('level') === 'region') {
      const kids = app.findRecordsByFilter('zones', "level = 'settlement' && parent = {:p}", '', 2000, 0, { p: zoneId })
      zoneIds = zoneIds.concat(kids.map((k) => k.id))
    }
  } catch (_) {}
  const inList = zoneIds.map((id) => `zone = '${id}'`).join(' || ')
  const rows = app.findRecordsByFilter('reports', `(${inList}) && hidden = false && note != ''`, '-created', 20, 0)
  return rows.map((r) => noteRow(app, r))
}
function notesForQuarter(app, quarterId) {
  const rows = app.findRecordsByFilter('reports', "zone = {:z} && hidden = false && note != ''", '-created', 20, 0, { z: quarterId })
  return rows.map((r) => noteRow(app, r))
}

function macroPin(app, z) {
  const d = deriveMacro(app, z.id) // region rollup (own event + child quarters)
  return { id: z.id, name: z.get('name'), region: z.get('display_region'), sev: d.sev, status: d.status,
    todayMin: d.todayMin, reports: d.reports, reports24h: d.reports24h || 0, confirms: d.confirms, confirmed: d.confirmed,
    lastSignal: d.lastSignal, staleClose: d.staleClose, since: d.since, lat: z.get('lat'), lng: z.get('lng') }
}

// National community feed: the latest notes across EVERY zone, newest first, each tagged with its
// originating quarter (`where`). Powers the Home "Community feed" strip + the Community tab's full
// feed so neighbours' voices are visible immediately, not buried inside one region's detail.
function nationalFeed(app, limit) {
  const rows = app.findRecordsByFilter('reports', "hidden = false && note != ''", '-created', limit || 12, 0)
  return rows.map((r) => noteRow(app, r))
}

function buildSnapshot(app) {
  const regions = app.findRecordsByFilter('zones', "level = 'region'", 'name', 100, 0)
  const macros = regions.map((z) => macroPin(app, z))
  const withOutage = macros.filter((m) => m.todayMin > 0)
  const meanMin = withOutage.length ? withOutage.reduce((a, m) => a + m.todayMin, 0) / withOutage.length : 0
  const { hours, mins } = hm(meanMin)
  const reports = countReports(app, "hidden = false && created >= {:mid}", { mid: pbTime(midnightUTC()) })
  // Active-outage quarters carry their OWN map dot at their real centroid. The national map
  // otherwise only plots the 7 region pins, so a single-quarter outage (GPS snaps to a quarter)
  // looked offset to the region centre — up to ~30 km (e.g. Bijilo vs the Brikama pin, ~19 km).
  // Only quarters with an OPEN event are included → the payload stays lean (typically 0–handful).
  const quarters = []
  app.findRecordsByFilter('events', "status = 'open'", '', 1000, 0).forEach((ev) => {
    let z
    try { z = app.findRecordById('zones', ev.get('zone')) } catch (_) { return }
    if (z.get('level') !== 'settlement') return
    const qd = deriveZone(app, z.id)
    quarters.push({
      id: z.id, name: z.get('name'), regionId: z.get('parent'),
      lat: z.get('lat'), lng: z.get('lng'),
      status: qd.status, sev: qd.sev, reports: qd.reports, confirms: qd.confirms, confirmed: qd.confirmed, lastSignal: qd.lastSignal,
      staleClose: qd.staleClose, since: qd.since,
    })
  })
  const regionsTotal = macros.length
  return {
    updatedAt: new Date().toISOString(),
    national: { hours, mins, regionsOut: macros.filter((m) => m.status !== 'on').length, regionsTotal, reports, hourly: buildHourly(app, regionsTotal) },
    macros,
    quarters,
    feed: nationalFeed(app, 8),
  }
}
// buildHourly — nationwide darkness timeline for today: for each hour bucket 00→24, the FRACTION
// of regions (0..1) that had an outage event overlapping that hour. Future hours = -1 (sentinel →
// rendered neutral grey "not yet"). Derived purely from events' started_at/ended_at; no fabrication.
function buildHourly(app, regionsTotal) {
  const mid = midnightUTC().getTime()
  const now = Date.now()
  const nowHour = Math.floor((now - mid) / 3600000)
  const total = regionsTotal || 7
  // events relevant to today: still open, or closed but ended after midnight
  let evs = []
  try {
    evs = app.findRecordsByFilter(
      'events', "status = 'open' || (status = 'closed' && ended_at >= {:mid})", '', 3000, 0,
      { mid: pbTime(midnightUTC()) },
    )
  } catch (_) { evs = [] }
  // resolve each event's region once (settlement → parent; region → itself)
  const spans = []
  evs.forEach((ev) => {
    const s = parsePB(ev.get('started_at'))
    if (!s) return
    const e = ev.get('status') === 'open' ? now : (parsePB(ev.get('ended_at')) ? parsePB(ev.get('ended_at')).getTime() : now)
    let rid = null
    try {
      const z = app.findRecordById('zones', ev.get('zone'))
      rid = z.get('level') === 'region' ? z.id : z.get('parent')
    } catch (_) { return }
    if (rid) spans.push({ s: s.getTime(), e, rid })
  })
  const out = []
  for (let h = 0; h < 24; h++) {
    if (h > nowHour) { out.push(-1); continue }
    const hStart = mid + h * 3600000, hEnd = hStart + 3600000
    const dark = {}
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i]
      if (sp.s < hEnd && sp.e > hStart) dark[sp.rid] = 1
    }
    out.push(+(Object.keys(dark).length / total).toFixed(3))
  }
  return out
}
function buildNational(app) {
  const s = buildSnapshot(app)
  return Object.assign({}, s.national, { date: dayStr(new Date()) })
}
function buildMacro(app, id) {
  const z = app.findRecordById('zones', id)
  const d = deriveMacro(app, id) // region header rolls up its quarters too
  const kids = app.findRecordsByFilter('zones', "level = 'settlement' && parent = {:p}", 'name', 500, 0, { p: id })
  const quarters = kids.map((q) => {
    const qd = deriveZone(app, q.id)
    return { id: q.id, regionId: id, name: q.get('name'), status: qd.status, sev: qd.sev, mins: qd.todayMin, reports: qd.reports, confirms: qd.confirms, confirmed: qd.confirmed, lastSignal: qd.lastSignal,
      staleClose: qd.staleClose, since: qd.since, events: eventsFor(app, q.id),
      lat: q.get('lat'), lng: q.get('lng'), notes: notesForQuarter(app, q.id) }
  })
  return {
    id: z.id, name: z.get('name'), region: z.get('display_region'),
    sev: d.sev, status: d.status, todayMin: d.todayMin, reports: d.reports, confirms: d.confirms, confirmed: d.confirmed, lastSignal: d.lastSignal,
    staleClose: d.staleClose, since: d.since,
    week: weekFor(app, id, d.todayMin), events: eventsForMany(app, [id].concat(kids.map((k) => k.id))), notes: notesFor(app, id), quarters,
  }
}

// ── read_models persistence + recompute ─────────────────────────────────────
function writeReadModel(app, key, data) {
  let row
  try {
    row = app.findFirstRecordByFilter('read_models', 'key = {:k}', { k: key })
  } catch (_) {
    row = new Record(app.findCollectionByNameOrId('read_models'))
    row.set('key', key)
  }
  row.set('data', data)
  app.save(row)
}
// ── request hardening (M2 anti-abuse) ───────────────────────────────────────
// Reject oversized POST bodies BEFORE parsing: per-field caps (sanitiseText) bound what we store,
// but nothing bounded what we'd parse — a multi-MB JSON body was free CPU/memory for an attacker.
// 16 KB comfortably fits every legitimate payload (longest: question body + photo is multipart and
// goes through PB's own upload limits, not this). Content-Length 0/-1 (chunked/unknown) passes —
// PB itself bounds total request size.
function bodyTooLarge(e, max) {
  const cap = max || 16384
  try {
    const len = Number(e.request.contentLength)
    return isFinite(len) && len > cap
  } catch (_) { return false }
}

// ── ops heartbeat + health (M1 ops hardening) ───────────────────────────────
// go_decay stamps a heartbeat each run; /api/go/ops/health (go_ops.pb.js) exposes its age so an
// external uptime monitor can alert on cron death / read-model staleness. No secrets, no user data.
function opsHeartbeat(app) {
  writeReadModel(app, 'ops:heartbeat', { at: new Date().toISOString() })
}
function opsHealth(app) {
  let heartbeatAge = null
  try {
    // PB JSON fields come back as types.JSONRaw (string-like): `raw.at` resolves to the NATIVE
    // String.prototype.at METHOD, not the JSON property — always JSON.parse the string form.
    const raw = app.findFirstRecordByFilter('read_models', "key = 'ops:heartbeat'").get('data')
    let atStr = ''
    try { atStr = JSON.parse(String(raw)).at || '' } catch (_) {}
    if (!atStr && raw && typeof raw.at === 'string') atStr = raw.at
    const at = Date.parse(String(atStr))
    if (!isNaN(at)) heartbeatAge = Math.round((Date.now() - at) / 1000)
  } catch (_) {}
  let lastReportAge = null
  try {
    const rows = app.findRecordsByFilter('reports', "id != ''", '-created', 1)
    if (rows.length) {
      const d = parsePB(String(rows[0].get('created')))
      if (d && !isNaN(d.getTime())) lastReportAge = Math.round((Date.now() - d.getTime()) / 1000)
    }
  } catch (_) {}
  // Push delivery liveness (2026-06-12): the Node sidecar drains push_queue every ~10s; a row
  // sitting longer than 15 min means the worker is dead/stuck and "power back" alerts silently
  // stopped. Only meaningful when VAPID is configured — without keys the worker idles by design
  // (but enqueue still writes rows, so an unconfigured box must not page the owner).
  let pushOldestAge = null
  try {
    const q = app.findRecordsByFilter('push_queue', "id != ''", 'created', 1)
    if (q.length) {
      const d = parsePB(String(q[0].get('created')))
      if (d && !isNaN(d.getTime())) pushOldestAge = Math.round((Date.now() - d.getTime()) / 1000)
    }
  } catch (_) {}
  const vapidOn = (env('VAPID_PUBLIC', '') || '') !== ''
  const pushOk = !vapidOn || pushOldestAge == null || pushOldestAge < 900
  // ok = the decay cron ran within 15 min (it runs every 5) AND push delivery is not stalled.
  // lastReportAge is informational only — quiet nights are normal; a monitor should not page on it.
  const ok = heartbeatAge != null && heartbeatAge < 900 && pushOk
  return { ok, heartbeat_age_sec: heartbeatAge, last_report_age_sec: lastReportAge, push_oldest_age_sec: pushOldestAge, push_ok: pushOk }
}
function ancestorsOf(app, zoneId) {
  // returns [zoneId, parentId?] (settlement → its region)
  const ids = [zoneId]
  try {
    const z = app.findRecordById('zones', zoneId)
    const p = z.get('parent')
    if (p) ids.push(p)
  } catch (_) {}
  return ids
}
function recompute(app, zoneId) {
  // refresh the affected zone + ancestors, rewrite snapshot + macro rows + national
  ancestorsOf(app, zoneId).forEach((id) => {
    try {
      const z = app.findRecordById('zones', id)
      const macroId = z.get('level') === 'region' ? id : z.get('parent')
      if (macroId) writeReadModel(app, `macro:${macroId}`, buildMacro(app, macroId))
    } catch (_) {}
  })
  writeReadModel(app, 'snapshot', buildSnapshot(app))
  writeReadModel(app, 'national', buildNational(app))
}
function recomputeAll(app) {
  writeReadModel(app, 'snapshot', buildSnapshot(app))
  writeReadModel(app, 'national', buildNational(app))
  app.findRecordsByFilter('zones', "level = 'region'", '', 100, 0).forEach((z) => {
    writeReadModel(app, `macro:${z.id}`, buildMacro(app, z.id))
  })
}

// ── rate-limit (§4.2.2) — returns a reason string if blocked, else null ─────
function rateLimitReason(app, rlk, zoneId, type, ipk) {
  const hourly = app.findRecordsByFilter('reports', 'rl_key = {:k} && created >= {:since}', '', 1000, 0,
    { k: rlk, since: pbTime(minutesAgo(60)) }).length
  if (hourly >= CFG.RL_HOURLY) return 'hourly report cap reached'
  // Per-IP cap — rl_key embeds the attacker-controlled UA, so the rl_key cap alone is escapable by
  // UA rotation; this one is not. Same public message (don't reveal which cap tripped).
  if (ipk) {
    const ipHourly = app.findRecordsByFilter('reports', 'ip_key = {:k} && created >= {:since}', '', 2000, 0,
      { k: ipk, since: pbTime(minutesAgo(60)) }).length
    if (ipHourly >= CFG.RL_IP_HOURLY) return 'hourly report cap reached'
  }
  // NOTE (2026-06-10, owner): the consecutive-OUT dedup window was REMOVED. On flickering grids
  // (e.g. Bijilo) residents need to re-affirm "still out" repeatedly; each repeat refreshes the
  // event's freshness (last_activity_at) so it doesn't auto-close while power is still flapping.
  // This is Sybil-safe BY CONSTRUCTION: `confirms` counts DISTINCT rl_key, so one device re-tapping
  // never inflates the trust count — it only keeps the outage alive. Spam is still bounded by the
  // per-device hourly cap (RL_HOURLY) and the per-IP cap (RL_IP_HOURLY) above. RL_OUT_WINDOW_MIN is
  // no longer enforced (kept in CFG/env for backward-compat only).
  return null
}

// ── decay cron: recompute distinct_out_60m for every open event (§4.4) ──────
function decayRefresh(app) {
  const open = app.findRecordsByFilter('events', "status = 'open'", '', 1000, 0)
  open.forEach((ev) => {
    const d = distinctOut60m(app, ev.get('zone'))
    ev.set('distinct_out_60m', d)
    ev.set('peak_concurrent', Math.max(ev.get('peak_concurrent') || 0, d))
    app.save(ev)
  })
  // expire stale live streams so the "LIVE now" strip hides once a broadcast is over (owner /endlive
  // is the primary path; this is the auto-expiry backstop after LIVE_MAX_HOURS).
  try {
    const lives = app.findRecordsByFilter('social_links', 'is_live = true', '', 200, 0)
    const nowMs = Date.now()
    lives.forEach((r) => {
      const exp = parsePB(r.get('live_expires_at'))
      if (exp && exp.getTime() < nowMs) { r.set('is_live', false); app.save(r) }
    })
  } catch (_) { /* social_links may be absent in minimal test DBs */ }
  return open.length
}

// ── auto-close cron: idle > AUTOCLOSE_IDLE_HOURS or open > MAX_EVENT_HOURS ──
function autoCloseStale(app) {
  const open = app.findRecordsByFilter('events', "status = 'open'", '', 1000, 0)
  let closed = 0
  open.forEach((ev) => {
    const started = parsePB(ev.get('started_at'))
    const last = parsePB(ev.get('last_activity_at')) || started
    const idleH = (Date.now() - last) / 3600000
    const ageH = (Date.now() - started) / 3600000
    if (idleH >= CFG.AUTOCLOSE_IDLE_HOURS || ageH >= CFG.MAX_EVENT_HOURS) {
      ev.set('status', 'closed')
      ev.set('ended_at', pbTime(new Date()))
      ev.set('auto_closed', true)
      app.save(ev)
      writeDailyStat(app, ev.get('zone'), ev)
      closed++
    }
  })
  return closed
}

// ── daily salt rotation (§4.6) ──────────────────────────────────────────────
function rotateSalt(app) {
  writeReadModel(app, 'config:daily_salt', { salt: $security.randomString(24) })
}

// ── Phase 5: Community / Wall of Honor ──────────────────────────────────────
// All quarter-level (rl_key rotates daily → no individual identity). Hours-in-the-Dark counts
// CONFIRMED events only (peak_concurrent >= CONFIRM_THRESHOLD) so a lone prankster can't
// manufacture hours. Africa/Banjul = UTC+0, no DST → plain UTC date math.
function communityMinQuarters() { return parseInt(env('COMMUNITY_MIN_QUARTERS', '6'), 10) }

// ISO-8601 week id "YYYY-Www" (UTC).
function isoWeekId(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // move to the Thursday of this week
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const ftDay = (firstThu.getUTCDay() + 6) % 7
  firstThu.setUTCDate(firstThu.getUTCDate() - ftDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000))
  return `${d.getUTCFullYear()}-W${pad(week)}`
}
// {startUtc, endUtc} = Monday 00:00 → next Monday 00:00 for an ISO week id.
function weekBounds(weekId) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId)
  if (!m) return null
  const year = parseInt(m[1], 10), week = parseInt(m[2], 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = (jan4.getUTCDay() + 6) % 7
  const week1Mon = new Date(jan4.getTime() - jan4Day * 86400000)
  const startUtc = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000)
  const endUtc = new Date(startUtc.getTime() + 7 * 86400000)
  return { startUtc, endUtc }
}
function prevWeekId(weekId) {
  const b = weekBounds(weekId)
  return isoWeekId(new Date(b.startUtc.getTime() - 3 * 86400000))
}

// Confirmed dark-minutes for a zone's events intersected with [startMs, endMs).
function darkMinutesInRange(app, zoneId, startMs, endMs) {
  const evs = app.findRecordsByFilter('events', 'zone = {:z}', '-started_at', 500, 0, { z: zoneId })
  let total = 0
  evs.forEach((ev) => {
    if ((ev.get('peak_concurrent') || 0) < CFG.COMMUNITY_CONFIRM_FLOOR) return // confirmed only (anti-gaming; launch floor)
    const s = parsePB(ev.getString('started_at')); if (!s) return
    const e = ev.get('status') === 'open' ? new Date() : parsePB(ev.getString('ended_at'))
    const eMs = e ? e.getTime() : Date.now()
    const ov = Math.min(eMs, endMs) - Math.max(s.getTime(), startMs)
    if (ov > 0) total += Math.round(ov / 60000)
  })
  return total
}
// Consecutive days up to today (UTC) with ≥1 report — Neighbourhood Watch streak (capped lookback).
function watchStreak(app, zoneId) {
  let streak = 0
  for (let i = 0; i < 14; i++) {
    const dayStart = new Date(midnightUTC().getTime() - i * 86400000)
    const dayEnd = new Date(dayStart.getTime() + 86400000)
    const n = app.findRecordsByFilter('reports', 'zone = {:z} && hidden = false && created >= {:s} && created < {:e}', '', 1, 0,
      { z: zoneId, s: pbTime(dayStart), e: pbTime(dayEnd) }).length
    if (n > 0) streak++; else break
  }
  return streak
}
// Cheap quarter badges (the expensive rapid_response/full_circle are deferred). Capped to callers.
function quarterBadges(app, zoneId, watchDays) {
  const out = []
  if ((watchDays >= 5 ? watchStreak(app, zoneId) : 0) >= 7) out.push({ key: 'first_watch', label: 'First Watch', zoneId })
  const total = countReports(app, 'zone = {:z} && hidden = false', { z: zoneId })
  if (total >= 100) out.push({ key: 'century', label: 'Century', zoneId })
  try {
    const won = app.findFirstRecordByFilter('weekly_honors', 'zone = {:z} && rank_voice = 1', { z: zoneId })
    if (won) out.push({ key: 'voice_of_week', label: 'Voice of the Week', zoneId, earnedWeek: won.get('week_id') })
  } catch (_) {}
  return out
}

// Shared per-week computation over [startUtc, end). Returns ranked hours + voice + national.
function communityWeek(app, weekId, endDate) {
  const b = weekBounds(weekId)
  const startMs = b.startUtc.getTime()
  const end = endDate || b.endUtc
  const endMs = Math.min(end.getTime(), Date.now())
  const reports = app.findRecordsByFilter('reports', 'hidden = false && created >= {:s} && created < {:e}', '-created', 20000, 0,
    { s: pbTime(b.startUtc), e: pbTime(new Date(endMs)) })
  const byZone = {}
  const nationalDays = {}
  reports.forEach((r) => {
    const z = r.get('zone'); if (!z) return
    const bz = byZone[z] || (byZone[z] = { keys: {}, days: {}, count: 0 })
    bz.keys[r.get('rl_key')] = 1
    const c = parsePB(r.getString('created')); if (c) { bz.days[dayStr(c)] = 1; nationalDays[dayStr(c)] = 1 }
    bz.count++
  })
  const hours = [], voice = []
  Object.keys(byZone).forEach((zid) => {
    let z; try { z = app.findRecordById('zones', zid) } catch (_) { return }
    if (z.get('level') !== 'settlement') return // pride unit = quarter
    const bz = byZone[zid]
    const reporters = Object.keys(bz.keys).length
    const watchDays = Object.keys(bz.days).length
    const dark = darkMinutesInRange(app, zid, startMs, endMs)
    const open = openEvent(app, zid)
    const confirms = open ? (open.get('peak_concurrent') || open.get('distinct_out_60m') || 0) : 0
    const meta = { zoneId: zid, name: z.get('name'), region: z.get('display_region') }
    if (dark > 0) hours.push(Object.assign({ darkMinutes: dark }, meta))
    voice.push(Object.assign({ reporters, confirms, watchDays }, meta))
  })
  hours.sort((a, b2) => b2.darkMinutes - a.darkMinutes).forEach((r, i) => { r.rankDark = i + 1 })
  voice.sort((a, b2) => (b2.reporters - a.reporters) || (b2.confirms - a.confirms)).forEach((r, i) => { r.rankVoice = i + 1 })
  const darkTotal = hours.reduce((a, r) => a + r.darkMinutes, 0)
  return {
    weekId,
    national: { darkMinutes: darkTotal, activeQuarters: voice.length, watchDays: Object.keys(nationalDays).length },
    hours, voice,
  }
}

// Live current-week community read-model (served at /api/go/community).
function deriveCommunity(app) {
  const now = new Date()
  const w = communityWeek(app, isoWeekId(now), now)
  // badges for the top participation quarters only (keeps the 5-min cron cheap on 1 GB)
  const badges = []
  w.voice.slice(0, 8).forEach((v) => { quarterBadges(app, v.zoneId, v.watchDays).forEach((b) => badges.push(b)) })
  return {
    weekId: w.weekId,
    updatedAt: now.toISOString(),
    national: w.national,
    hours: w.hours,
    voice: w.voice,
    badges,
    feed: nationalFeed(app, 30),
    ranksVisible: w.national.activeQuarters >= communityMinQuarters(),
  }
}
function recomputeCommunity(app) {
  writeReadModel(app, 'community', deriveCommunity(app))
}

// Freeze a closed week into weekly_honors (idempotent upsert; never overwrites seed/illustrative rows).
function freezeWeek(app, weekId) {
  const b = weekBounds(weekId)
  const w = communityWeek(app, weekId, b.endUtc)
  const map = {}
  w.hours.forEach((h) => { const m = map[h.zoneId] = map[h.zoneId] || { region: h.region }; m.dark = h.darkMinutes; m.rankDark = h.rankDark; m.region = h.region })
  w.voice.forEach((v) => { const m = map[v.zoneId] = map[v.zoneId] || { region: v.region }; m.reporters = v.reporters; m.confirms = v.confirms; m.watchDays = v.watchDays; m.rankVoice = v.rankVoice; m.region = v.region })
  const col = app.findCollectionByNameOrId('weekly_honors')
  let n = 0
  Object.keys(map).forEach((zid) => {
    const m = map[zid]
    let row
    try { row = app.findFirstRecordByFilter('weekly_honors', 'week_id = {:w} && zone = {:z}', { w: weekId, z: zid }) }
    catch (_) { row = new Record(col); row.set('week_id', weekId); row.set('zone', zid) }
    if (row.get('source') === 'seed') return // protect the illustrative history (integrity rule)
    row.set('region', m.region || '')
    row.set('dark_minutes', m.dark || 0)
    row.set('distinct_reporters', m.reporters || 0)
    row.set('confirms', m.confirms || 0)
    row.set('watch_days', m.watchDays || 0)
    row.set('rank_dark', m.rankDark || 0)
    row.set('rank_voice', m.rankVoice || 0)
    row.set('illustrative', false)
    row.set('source', 'live')
    app.save(row); n++
  })
  return n
}

// Read a frozen week from weekly_honors (served at /api/go/community/week/{id}).
function buildCommunityWeek(app, weekId) {
  const rows = app.findRecordsByFilter('weekly_honors', 'week_id = {:w}', 'rank_dark', 500, 0, { w: weekId })
  if (!rows.length) return null
  let darkTotal = 0, illustrative = false
  const hours = [], voice = []
  rows.forEach((r) => {
    const zid = r.get('zone')
    let name = zid; try { name = app.findRecordById('zones', zid).get('name') } catch (_) {}
    const dark = r.get('dark_minutes') || 0
    darkTotal += dark
    if (r.get('illustrative')) illustrative = true
    const region = r.get('region') || ''
    hours.push({ zoneId: zid, name, region, darkMinutes: dark, rankDark: r.get('rank_dark') || 0, illustrative: !!r.get('illustrative') })
    voice.push({ zoneId: zid, name, region, reporters: r.get('distinct_reporters') || 0, confirms: r.get('confirms') || 0, watchDays: r.get('watch_days') || 0, rankVoice: r.get('rank_voice') || 0 })
  })
  hours.sort((a, b2) => (a.rankDark || 999) - (b2.rankDark || 999))
  voice.sort((a, b2) => (a.rankVoice || 999) - (b2.rankVoice || 999))
  return {
    weekId,
    illustrative,
    national: { darkMinutes: darkTotal, activeQuarters: rows.length },
    hours, voice,
  }
}

// Anonymous first-witness label for an event ("First witnessed by a neighbour at HH:MM").
function firstWitnessLabel(ev) {
  const s = parsePB(ev.getString('started_at'))
  return s ? `First witnessed by a neighbour at ${clock(s)}` : ''
}
// "Light back" relief feed item when an event closes.
function lightBackEntry(app, ev) {
  let name = ev.get('zone')
  try { name = app.findRecordById('zones', ev.get('zone')).get('name') || name } catch (_) {}
  return { kind: 'light_back', where: name, dur: fmtHM(eventMinutes(ev)), at: feedStamp(parsePB(ev.getString('ended_at'))) }
}

// ── Web Push (Phase 3) ──────────────────────────────────────────────────────
// Enqueue one push_queue row when an event closes (power back). Idempotent via the
// unique (event, kind) index — a retry of the same close is a no-op. The Node sidecar
// polls push_queue, sends via web-push, and deletes the row. Hooks can't run web-push.
// Enqueue a push for an event, of the given kind ('back' on close, 'out' on open). Idempotent per
// (event, kind) via the push_queue unique index → at most one notification per event per kind.
function enqueuePush(app, ev, kind) {
  try {
    const zoneId = ev.get('zone')
    let zoneName = zoneId
    try { zoneName = app.findRecordById('zones', zoneId).get('name') || zoneId } catch (_) {}
    const col = app.findCollectionByNameOrId('push_queue')
    const row = new Record(col)
    row.set('event', ev.id)
    row.set('zone', zoneId)
    row.set('zone_name', zoneName)
    row.set('kind', kind)
    row.set('attempts', 0)
    app.save(row)
  } catch (err) {
    const m = String(err)
    if (!/unique|constraint|UNIQUE/i.test(m)) app.logger().warn(`enqueuePush(${kind}) failed`, 'err', m)
  }
}
function enqueueOutPush(app, ev) { enqueuePush(app, ev, 'out') }
function enqueueBackPush(app, ev) { enqueuePush(app, ev, 'back') }

// Upsert a Web Push subscription for a zone (anonymous; (endpoint, zone) is the identity since
// 2026-06-12 — one device may hold bells on several zones; the old endpoint-only upsert silently
// MOVED the subscription between zones). Enforces SUB_MAX per zone, evicting the STALEST
// (`updated` asc) beyond the cap: re-subscribe heartbeats from active devices refresh `updated`,
// so a flood of fresh fake endpoints can no longer push out long-time real subscribers the way
// created-order FIFO did. Returns the saved record id.
function subscribePush(app, zoneId, endpoint, p256dh, auth, kinds) {
  const subMax = parseInt(env('SUB_MAX', '200'), 10)
  // Delivery preference: which alert kinds this device wants for this zone. Validate against the
  // allowed set; default to ['back'] (the original behaviour) if absent/garbage.
  let kindList = Array.isArray(kinds) ? kinds.filter((k) => k === 'out' || k === 'back') : []
  if (kindList.length === 0) kindList = ['back']
  let rec
  try {
    rec = app.findFirstRecordByFilter('subscriptions', 'endpoint = {:e} && zone = {:z}', { e: endpoint, z: zoneId })
  } catch (_) {
    rec = new Record(app.findCollectionByNameOrId('subscriptions'))
    rec.set('endpoint', endpoint)
    rec.set('zone', zoneId)
  }
  rec.set('p256dh', p256dh || '')
  rec.set('auth', auth || '')
  rec.set('kinds', kindList)
  app.save(rec)
  // Evict the stalest beyond the per-zone cap (see header note).
  const all = app.findRecordsByFilter('subscriptions', 'zone = {:z}', 'updated', 1000, 0, { z: zoneId })
  if (all.length > subMax) {
    for (let i = 0; i < all.length - subMax; i++) {
      try { app.delete(all[i]) } catch (_) {}
    }
  }
  return rec.id
}

// zoneId given → remove only that (endpoint, zone) bell, keeping the device's other zones.
// zoneId omitted → full opt-out: remove every row for the endpoint (the device dropped its
// browser PushSubscription entirely).
function unsubscribePush(app, endpoint, zoneId) {
  try {
    const filter = zoneId ? 'endpoint = {:e} && zone = {:z}' : 'endpoint = {:e}'
    const rows = app.findRecordsByFilter('subscriptions', filter, '', 500, 0, { e: endpoint, z: zoneId || '' })
    rows.forEach((r) => { try { app.delete(r) } catch (_) {} })
    return rows.length > 0
  } catch (_) {
    return false
  }
}

// Per-IP subscribe rate limit (2026-06-12). With Turnstile OFF, POST /api/go/subscribe was a free
// flood surface: 20 forged endpoints evicted every real subscriber of a zone (SUB_MAX FIFO). The
// sub_rl ledger stores ONLY ip_key + created — no endpoint/zone — so it can never correlate a push
// device with the anonymous report stream. Returns true when the subscribe may proceed.
function subRlCheck(app, ipk) {
  if (!ipk) return true // no resolvable IP (tests, internal) — never block on guard plumbing
  const cap = parseInt(env('SUB_IP_HOURLY', '10'), 10)
  const hourAgo = pbTime(new Date(Date.now() - 3600000))
  try {
    // self-cleaning: drop this key's rows older than the window + a bounded sweep of day-old rows
    // (ip_key rotates daily, so stale keys would otherwise accumulate forever).
    app.findRecordsByFilter('sub_rl', 'ip_key = {:k} && created < {:t}', '', 200, 0, { k: ipk, t: hourAgo })
      .forEach((r) => { try { app.delete(r) } catch (_) {} })
    app.findRecordsByFilter('sub_rl', 'created < {:t}', '', 200, 0, { t: pbTime(new Date(Date.now() - 86400000)) })
      .forEach((r) => { try { app.delete(r) } catch (_) {} })
    const recent = app.findRecordsByFilter('sub_rl', 'ip_key = {:k} && created >= {:t}', '', cap + 1, 0, { k: ipk, t: hourAgo })
    if (recent.length >= cap) return false
    const row = new Record(app.findCollectionByNameOrId('sub_rl'))
    row.set('ip_key', ipk)
    app.save(row)
    return true
  } catch (_) {
    return true // ledger trouble must never take the subscribe endpoint down
  }
}

// ── Admin ops dashboard (superuser-gated; see go_admin.pb.js) ───────────────
// Curated, read-only operational snapshot for the owner dashboard at /admin. Aggregates only —
// nothing here is more sensitive than what the superuser already sees in the PB admin UI, and the
// route is gated by $apis.requireSuperuserAuth() (defence-in-depth behind Cloudflare Access). It
// reuses the SAME derive helpers as the public read-models, so the numbers always agree with the
// live site.
function adminCount(app, filter, params) {
  try { return app.findRecordsByFilter('reports', filter, '', 5000, 0, params || {}).length } catch (_) { return 0 }
}
function buildAdminOverview(app) {
  const now = new Date()
  const midnight = pbTime(midnightUTC())
  const h1 = pbTime(minutesAgo(60))
  const h24 = pbTime(minutesAgo(1440))

  const reports = {
    today: adminCount(app, 'created >= {:t}', { t: midnight }),
    lastHour: adminCount(app, 'created >= {:t}', { t: h1 }),
    last24h: adminCount(app, 'created >= {:t}', { t: h24 }),
    out24h: adminCount(app, "type = 'out' && created >= {:t}", { t: h24 }),
    back24h: adminCount(app, "type = 'back' && created >= {:t}", { t: h24 }),
    gps24h: adminCount(app, "source = 'gps' && created >= {:t}", { t: h24 }),
    manual24h: adminCount(app, "source = 'manual' && created >= {:t}", { t: h24 }),
    flagged24h: adminCount(app, "flagged = true && created >= {:t}", { t: h24 }),
    total: adminCount(app, "id != ''", {}),
  }

  let openRows = []
  try { openRows = app.findRecordsByFilter('events', "status = 'open'", '-started_at', 300, 0) } catch (_) {}
  const events = openRows.map((ev) => {
    const zoneId = ev.get('zone')
    let name = zoneId, region = ''
    try { const z = app.findRecordById('zones', zoneId); name = z.get('name'); region = z.get('display_region') } catch (_) {}
    const started = parsePB(ev.getString('started_at'))
    const last = parsePB(ev.getString('last_activity_at'))
    return {
      zone: zoneId, name, region,
      startedAt: ev.getString('started_at'),
      ageMin: started ? Math.round((Date.now() - started) / 60000) : 0,
      idleMin: last ? Math.round((Date.now() - last) / 60000) : null,
      peak: ev.get('peak_concurrent') || 0,
      out: ev.get('out_confirmations') || 0,
      back: ev.get('back_confirmations') || 0,
      distinct60: distinctOut60m(app, zoneId),
    }
  })

  let q = []
  try { q = app.findRecordsByFilter('push_queue', "id != ''", '-created', 500, 0) } catch (_) {}
  let maxAttempts = 0, retrying = 0
  q.forEach((r) => { const a = r.get('attempts') || 0; if (a > maxAttempts) maxAttempts = a; if (a > 0) retrying++ })

  let subs = 0, regions = 0, settlements = 0
  try { subs = app.findRecordsByFilter('subscriptions', "id != ''", '', 100000, 0).length } catch (_) {}
  try { regions = app.findRecordsByFilter('zones', "level = 'region'", '', 1000, 0).length } catch (_) {}
  try { settlements = app.findRecordsByFilter('zones', "level = 'settlement'", '', 5000, 0).length } catch (_) {}

  let lastReportAt = null
  try { const lr = app.findRecordsByFilter('reports', "id != ''", '-created', 1, 0); if (lr.length) lastReportAt = lr[0].getString('created') } catch (_) {}

  return {
    now: pbTime(now),
    national: buildNational(app),
    reports,
    events,
    push: { depth: q.length, retrying, maxAttempts },
    subscriptions: subs,
    zones: { regions, settlements },
    feed: nationalFeed(app, 12),
    communityLinks: adminCommunityLinks(app, 50),
    system: {
      confirmThreshold: CFG.CONFIRM_THRESHOLD,
      backCloseFloor: CFG.BACK_CLOSE_FLOOR,
      backDisplayFloor: CFG.BACK_DISPLAY_FLOOR,
      communityConfirmFloor: CFG.COMMUNITY_CONFIRM_FLOOR,
      autocloseIdleHours: CFG.AUTOCLOSE_IDLE_HOURS,
      maxEventHours: CFG.MAX_EVENT_HOURS,
      snapRadiusKm: CFG.SNAP_RADIUS_KM,
      rlOutWindowMin: CFG.RL_OUT_WINDOW_MIN,
      rlHourly: CFG.RL_HOURLY,
      turnstile: turnstileEnabled(),
      lastReportAt,
    },
  }
}
// Recent raw reports for the debug panel. Coarsened GPS is already at rest (P0); rl_key is a daily,
// rotating, non-PII hash — we expose only its first 8 chars so duplicate devices are recognisable
// without revealing the full key. Superuser-only.
function recentReports(app, limit) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 80, 1), 200)
  let rows = []
  try { rows = app.findRecordsByFilter('reports', "id != ''", '-created', n, 0) } catch (_) {}
  return rows.map((r) => {
    let where = r.get('zone')
    try { where = app.findRecordById('zones', r.get('zone')).get('name') } catch (_) {}
    const rk = (r.get('rl_key') || '').toString()
    return {
      id: r.id,
      created: r.getString('created'),
      type: r.get('type'),
      source: r.get('source'),
      zone: r.get('zone'),
      where,
      note: r.get('note') || '',
      flagged: !!r.get('flagged'),
      hidden: !!r.get('hidden'),
      lat: r.get('lat'),
      lng: r.get('lng'),
      event: r.get('event') || '',
      rlKey8: rk ? rk.slice(0, 8) : '',
    }
  })
}

// ── Gamification: rank ladder (cumulative XP). Thresholds confirmed at brainstorming 2026-06-03.
// Tunable: change the `min` values only. XP awards: OUT/BACK base 10, confirm 5, first bonus +15.
const RANKS = [
  { key: 'observer',  label: 'Observer',                min: 0 },
  { key: 'watcher',   label: 'Watcher',                 min: 10 },
  { key: 'sentinel',  label: 'Sentinel',                min: 30 },
  { key: 'guardian',  label: 'Guardian of the Quarter', min: 50 },
]
function rankFor(xp) {
  let cur = RANKS[0]
  for (const r of RANKS) { if (xp >= r.min) cur = r }
  return cur
}

// Mint an UNCLAIMED xp_grants row for an accepted report. `opts.state` = pre-merge event snapshot the
// hook captured BEFORE e.next()/merge: { wasOpen: bool, priorBack: number }. opts.claimNonce is the
// client's random secret (never stored on the report). Idempotent: the unique nonce_hash index drops
// a replayed report's duplicate grant. NEVER store report id / client_uuid / rl_key here.
function mintGrant(app, opts) {
  const claimNonce = String(opts.claimNonce || '')
  if (claimNonce.length < 16 || claimNonce.length > 128) return // no/short nonce → skip silently
  const type = opts.type
  let kind, badge = '', xp
  if (type === 'out') {
    if (opts.state && opts.state.wasOpen) { kind = 'confirm'; xp = 5 }
    else { kind = 'out'; badge = 'first_witness'; xp = 25 }
  } else { // back
    if (opts.state && (opts.state.priorBack || 0) === 0) { kind = 'back'; badge = 'light_spotter'; xp = 25 }
    else { kind = 'back'; xp = 10 }
  }
  const col = app.findCollectionByNameOrId('xp_grants')
  const g = new Record(col)
  g.set('nonce_hash', $security.sha256(claimNonce))
  g.set('xp', xp)
  g.set('kind', kind)
  g.set('badge', badge)
  g.set('week_id', isoWeekId(new Date()))
  try {
    app.save(g)
  } catch (err) {
    // unique nonce clash = report replay → expected, ignore. Anything else is a real fault → log it.
    if (!String(err).toLowerCase().includes('unique')) app.logger().error('mintGrant save failed', 'err', String(err))
  }
}

// Redeem an unclaimed grant into the account's ledger. Idempotent: if the grant is gone but a ledger
// row with this nonce_hash exists, treat as already-claimed (no double credit). The unique nonce_hash
// index on xp_ledger is the final guard against a double-credit race.
function claimGrant(app, accountId, claimNonce) {
  if (!/^[a-f0-9]{64}$/.test(String(accountId || ''))) throw new Error('bad account')
  const nonce = String(claimNonce || '')
  if (nonce.length < 16 || nonce.length > 128) throw new Error('bad nonce')
  const nh = $security.sha256(nonce)
  const existing = app.findRecordsByFilter('xp_ledger', 'nonce_hash = {:n}', '', 1, 0, { n: nh })
  if (existing.length) return // benign — idempotent re-claim
  const grants = app.findRecordsByFilter('xp_grants', 'nonce_hash = {:n}', '', 1, 0, { n: nh })
  if (!grants.length) return // nothing to claim (expired/never minted) — benign
  const g = grants[0]
  const col = app.findCollectionByNameOrId('xp_ledger')
  const row = new Record(col)
  row.set('account_id', accountId)
  row.set('nonce_hash', nh)
  row.set('xp', g.get('xp'))
  row.set('kind', g.get('kind'))
  row.set('badge', g.get('badge'))
  row.set('week_id', g.get('week_id'))
  try { app.save(row) } catch (_) { /* unique clash = concurrent claim; benign */ }
  try { app.delete(g) } catch (_) {}
}

// Aggregate one account's ledger → { xp, rank, rankLabel, nextRank, toNext, badges[], streakWeeks,
// week_id }. Filters by the exact account_id (a client-held capability); the collection is
// non-listable so it cannot be enumerated.
function buildProfile(app, accountId) {
  if (!/^[a-f0-9]{64}$/.test(String(accountId || ''))) throw new Error('bad account')
  const rows = app.findRecordsByFilter('xp_ledger', 'account_id = {:a}', '-created', 5000, 0, { a: accountId })
  let xp = 0
  const badges = {}
  const weeks = {}
  for (const r of rows) {
    xp += r.get('xp') || 0
    const b = r.get('badge'); if (b) badges[b] = true
    weeks[r.get('week_id')] = true
  }
  const rank = rankFor(xp)
  const idx = RANKS.indexOf(rank)
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null
  let streak = 0, w = isoWeekId(new Date())
  while (weeks[w]) { streak++; w = prevWeekId(w) }
  if (streak >= 2) badges['always_watching'] = true
  return {
    xp,
    rank: rank.key, rankLabel: rank.label,
    nextRank: next ? next.key : null, toNext: next ? Math.max(0, next.min - xp) : 0,
    badges: Object.keys(badges),
    streakWeeks: streak,
    week_id: isoWeekId(new Date()),
  }
}

// Public app-wide stats: real contributors (distinct accounts that earned XP) + total reports.
// Raw scalar COUNTs (accurate, not the 5000-capped countReports). Cheap; edge micro-caches /api/go/*.
function buildStats(app) {
  function scalar(sql) {
    try {
      const row = new DynamicModel({ c: 0 })
      app.db().newQuery(sql).one(row)
      return row.c || 0
    } catch (err) {
      app.logger().error('buildStats query failed', 'sql', sql, 'err', String(err))
      return 0
    }
  }
  return {
    contributors: scalar('SELECT COUNT(DISTINCT account_id) AS c FROM xp_ledger'),
    reports: scalar('SELECT COUNT(*) AS c FROM reports'),
  }
}

// ── Community UGC — persistent-pseudonym social layer (posts / comments / self-intro) ─────────
// Attributed to the device pseudonym (account_id + nickname + avatar_id); NEVER linked to reports
// (no rl_key stored on social rows). Moderation = automatic only: sanitise + per-account caps.
const ACCT_RE = /^[a-f0-9]{64}$/
const AVATAR_RE = /^[a-z0-9_-]{1,40}$/
function cleanNick(s) { return sanitiseText(s, 24) }
function cleanAvatar(s) { const a = String(s || ''); return AVATAR_RE.test(a) ? a : '' }
function relAgo(created) {
  const t = parsePB(created)
  const mins = t ? Math.max(0, Math.round((Date.now() - t.getTime()) / 60000)) : 0
  return mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
}
function socialRateLimited(app, collection, accountId, cap) {
  const n = app.findRecordsByFilter(collection, 'account_id = {:a} && created >= {:since}', '', 1000, 0,
    { a: accountId, since: pbTime(minutesAgo(60)) }).length
  return n >= cap ? 'hourly limit reached — try again later' : null
}
function zoneNameSafe(app, id) { try { return app.findRecordById('zones', id).get('name') } catch (_) { return null } }

function createPost(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const text = sanitiseText(body.body, 280)
  if (!text) throw new BadRequestError('empty post')
  const blocked = socialRateLimited(app, 'posts', account, CFG.POST_HOURLY)
  if (blocked) throw new BadRequestError(blocked)
  let zoneId = ''
  if (body.zone) { if (!zoneNameSafe(app, String(body.zone))) throw new BadRequestError('unknown zone'); zoneId = String(body.zone) }
  const rec = new Record(app.findCollectionByNameOrId('posts'))
  rec.set('account_id', account)
  rec.set('nickname', cleanNick(body.nickname))
  rec.set('avatar_id', cleanAvatar(body.avatar_id))
  if (zoneId) rec.set('zone', zoneId)
  rec.set('body', text)
  rec.set('hidden', false)
  app.save(rec)
  return postShape(app, rec)
}
function createComment(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  // Polymorphic target: zone (neighbour discussion) | social (From-Facebook/live card) | question (Q&A answer).
  const targetType = String(body.target_type || 'zone')
  const targetId = String(body.target_id || body.zone || '')
  if (!targetId) throw new BadRequestError('target required')
  if (targetType === 'zone') { if (!zoneNameSafe(app, targetId)) throw new BadRequestError('unknown zone') }
  else if (targetType === 'social') { try { app.findRecordById('social_links', targetId) } catch (_) { throw new BadRequestError('unknown target') } }
  else if (targetType === 'community_link') { try { app.findRecordById('community_links', targetId) } catch (_) { throw new BadRequestError('unknown target') } }
  else if (targetType === 'question') { try { app.findRecordById('questions', targetId) } catch (_) { throw new BadRequestError('unknown target') } }
  else throw new BadRequestError('bad target type')
  const text = sanitiseText(body.body, 240)
  if (!text) throw new BadRequestError('empty comment')
  const blocked = socialRateLimited(app, 'comments', account, CFG.COMMENT_HOURLY)
  if (blocked) throw new BadRequestError(blocked)
  const rec = new Record(app.findCollectionByNameOrId('comments'))
  rec.set('account_id', account)
  rec.set('nickname', cleanNick(body.nickname))
  rec.set('avatar_id', cleanAvatar(body.avatar_id))
  rec.set('target_type', targetType)
  rec.set('target_id', targetId)
  rec.set('body', text)
  rec.set('hidden', false)
  app.save(rec)
  return commentShape(rec)
}
function saveIntro(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  let rec
  try { rec = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account }) }
  catch (_) { rec = new Record(app.findCollectionByNameOrId('profiles')); rec.set('account_id', account) }
  rec.set('nickname', cleanNick(body.nickname))
  rec.set('avatar_id', cleanAvatar(body.avatar_id))
  rec.set('bio', sanitiseText(body.bio, 160))
  // Self-declared home neighbourhood (a chosen quarter, NOT report-derived). Validate it exists.
  const hz = String(body.home_zone || '')
  if (hz) { const nm = zoneNameSafe(app, hz); rec.set('home_zone', nm ? hz : ''); rec.set('home_zone_name', nm || '') }
  else { rec.set('home_zone', ''); rec.set('home_zone_name', '') }
  app.save(rec)
  return socialProfile(app, account)
}
function socialProfile(app, account) {
  if (!ACCT_RE.test(String(account))) return null
  try {
    const r = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account })
    return { nickname: r.get('nickname') || '', avatarId: r.get('avatar_id') || '', bio: r.get('bio') || '',
      homeZone: r.get('home_zone') || '', homeZoneName: r.get('home_zone_name') || '',
      discoverable: !!r.get('discoverable'), acceptRequests: !!r.get('accept_requests'),
      isModerator: !!r.get('is_moderator') }
  } catch (_) { return null }
}
function postShape(app, r) {
  const zid = r.get('zone')
  return {
    id: r.id, nickname: r.get('nickname') || '', avatarId: r.get('avatar_id') || '',
    zoneId: zid || null, zoneName: zid ? zoneNameSafe(app, zid) : null,
    body: r.get('body'), created: r.getString('created'), ago: relAgo(r.getString('created')),
  }
}
function commentShape(r) {
  return {
    id: r.id, nickname: r.get('nickname') || '', avatarId: r.get('avatar_id') || '',
    body: r.get('body'), created: r.getString('created'), ago: relAgo(r.getString('created')),
    targetType: r.get('target_type') || 'zone', targetId: r.get('target_id') || '',
  }
}
function buildFeed(app, limit) {
  const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 50))
  const rows = app.findRecordsByFilter('posts', 'hidden = false', '-created', n, 0)
  return { posts: rows.map((r) => postShape(app, r)) }
}
function buildComments(app, targetType, targetId, limit) {
  const n = Math.max(1, Math.min(200, parseInt(limit, 10) || 100))
  const rows = app.findRecordsByFilter('comments', 'target_type = {:t} && target_id = {:i} && hidden = false', '-created', n, 0, { t: String(targetType), i: String(targetId) })
  return { comments: rows.map(commentShape) }
}
function buildZoneComments(app, zoneId, limit) { return buildComments(app, 'zone', zoneId, limit) }

// ── Q&A board ("Talk" tab): pseudonymous questions, answers are comments(target_type='question') ──
function questionShape(r) {
  const img = r.get('image')
  return { id: r.id, nickname: r.get('nickname') || '', avatarId: r.get('avatar_id') || '',
    title: r.get('title') || '', body: r.get('body') || '', zone: r.get('zone') || '',
    image: img ? `/api/files/questions/${r.id}/${img}` : '',
    created: r.getString('created'), ago: relAgo(r.getString('created')) }
}
function createQuestion(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const title = sanitiseText(body.title, 120)
  if (!title) throw new BadRequestError('empty question')
  const text = sanitiseText(body.body, 280)
  const blocked = socialRateLimited(app, 'questions', account, CFG.QUESTION_HOURLY)
  if (blocked) throw new BadRequestError(blocked)
  const rec = new Record(app.findCollectionByNameOrId('questions'))
  rec.set('account_id', account)
  rec.set('nickname', cleanNick(body.nickname))
  rec.set('avatar_id', cleanAvatar(body.avatar_id))
  rec.set('title', title)
  rec.set('body', text)
  rec.set('hidden', false)
  app.save(rec)
  return questionShape(rec)
}
function buildQuestions(app, limit) {
  const n = Math.max(1, Math.min(100, parseInt(limit, 10) || 50))
  const rows = app.findRecordsByFilter('questions', 'hidden = false', '-created', n, 0)
  return { questions: rows.map(questionShape) }
}
function buildQuestionThread(app, id) {
  let q
  try { q = app.findRecordById('questions', String(id)) } catch (_) { throw new BadRequestError('not found') }
  if (q.get('hidden')) throw new BadRequestError('not found')
  return { question: questionShape(q), answers: buildComments(app, 'question', q.id, '200').comments }
}
// Edit a Talk question — author-only (the device account_id must match the row's). Title/body/zone.
function updateQuestion(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  let q
  try { q = app.findRecordById('questions', String(body.id || '')) } catch (_) { throw new BadRequestError('not found') }
  if (q.get('hidden')) throw new BadRequestError('not found')
  if (String(q.get('account_id')) !== account) throw new BadRequestError('forbidden') // only the author may edit
  const title = sanitiseText(body.title, 120)
  if (!title) throw new BadRequestError('empty question')
  q.set('title', title)
  q.set('body', sanitiseText(body.body, 280))
  if (body.zone !== undefined) { const hz = String(body.zone || ''); q.set('zone', hz && zoneNameSafe(app, hz) ? hz : '') }
  app.save(q)
  return questionShape(q)
}
// Delete a Talk question — author-only. Soft-delete (hidden=true) so it drops from the list + thread.
function deleteQuestion(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  let q
  try { q = app.findRecordById('questions', String(body.id || '')) } catch (_) { throw new BadRequestError('not found') }
  if (String(q.get('account_id')) !== account) throw new BadRequestError('forbidden')
  q.set('hidden', true)
  app.save(q)
  return { ok: true, id: q.id }
}

// ── Moderation — capability-gated HARD delete (e.g. ATPC / VALDA) ─────────────────────────────────
// A moderator is a profile with is_moderator=true (the owner flips it in /_/, found by nickname). The
// power is authorised by the caller's account_id capability (same trust model as every social write) —
// NOT by nickname. Unlike the superuser soft-hide (setContentHidden), this is an IRREVERSIBLE hard
// delete with cascade to child comments, bounded by a per-account hourly cap, and written to a mod_log
// audit row. The audit stores the MODERATOR's OWN account in `mod_account` (an action trail) and stays
// entirely inside the pseudonym layer — it carries no device dedupe key and never touches the anonymous
// outage stream.
const MOD_DELETE_HOURLY = 1000 // bound the blast radius if a moderator capability ever leaks
const MOD_DELETE_COLLECTIONS = { comment: 'comments', question: 'questions', post: 'posts', community_link: 'community_links', social_link: 'social_links' }

function isModeratorAccount(app, account) {
  if (!ACCT_RE.test(String(account))) return false
  try { return !!app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: String(account) }).get('is_moderator') }
  catch (_) { return false }
}
function modActionsLastHour(app, account) {
  try { return app.findRecordsByFilter('mod_log', 'mod_account = {:a} && created >= {:since}', '', 2000, 0, { a: String(account), since: pbTime(minutesAgo(60)) }).length }
  catch (_) { return 0 }
}
function writeModLog(app, account, type, id, cascaded) {
  let nickname = ''
  try { nickname = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account }).get('nickname') || '' } catch (_) {}
  const row = new Record(app.findCollectionByNameOrId('mod_log'))
  row.set('mod_account', account)   // the moderator's OWN action capability — stays in the pseudonym layer
  row.set('mod_nickname', nickname)
  row.set('action', 'delete')
  row.set('target_type', String(type))
  row.set('target_id', String(id))
  row.set('cascaded', cascaded)
  app.save(row)
}
// HARD-delete ANY user content by type, author-agnostic. Cascades child comments for question/post.
function modDelete(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  if (!isModeratorAccount(app, account)) throw new BadRequestError('forbidden')
  const type = String(body.type || '')
  const col = MOD_DELETE_COLLECTIONS[type]
  if (!col) throw new BadRequestError('bad type')
  const id = String(body.id || '')
  let rec
  try { rec = app.findRecordById(col, id) } catch (_) { throw new BadRequestError('not found') }
  if (modActionsLastHour(app, account) >= MOD_DELETE_HOURLY) throw new BadRequestError('hourly limit reached — try again later')
  // Cascade: a question's answers and a post's comments are child rows keyed by target_type/target_id.
  let cascaded = 0
  if (type === 'question' || type === 'post') {
    try {
      const kids = app.findRecordsByFilter('comments', 'target_type = {:t} && target_id = {:i}', '', 5000, 0, { t: type, i: id })
      for (let i = 0; i < kids.length; i++) { try { app.delete(kids[i]); cascaded++ } catch (_) {} }
    } catch (_) {}
  }
  app.delete(rec)
  try { writeModLog(app, account, type, id, cascaded) } catch (_) {}
  return { ok: true, type: type, id: id, cascaded: cascaded }
}

// ── People directory — opt-in neighbour discovery + "wave" (saluta) requests ─────────────────────
// Pseudonym-only social graph (account_id capability), NEVER linked to reports, NEVER carrying an
// rl_key. account_id stays server-only: every person is addressed publicly by their PROFILE RECORD
// ID, so a wave is sent without exposing anyone's capability id. A wave is a directed connection row
// (pending → accepted/declined). Visibility = profiles.discoverable (strict opt-in); contactability =
// profiles.accept_requests. Either-direction block hides + bars waves. (Placed before the community-
// link like/report helpers so the anonymity source-scan's likeCommunityLink→module.exports slice
// stays scoped to the anonymous dedupe code.)
const WAVE_HOURLY = 20 // ≤ N outgoing waves per account / hour (anti-spam)

// One person's PUBLIC card: profile record id (the addressable handle), pseudonym, home zone, rank.
// xp/rank come from the account's ledger (buildProfile) — small per-row scan, fine at this scale.
function personCard(app, rec) {
  const account = String(rec.get('account_id') || '')
  let xp = 0, rankLabel = 'Observer'
  try { const pr = buildProfile(app, account); xp = pr.xp; rankLabel = pr.rankLabel } catch (_) {}
  return {
    id: rec.id, // PUBLIC handle (profile record id) — NOT the account_id capability
    nickname: rec.get('nickname') || 'Anonymous neighbour',
    avatarId: rec.get('avatar_id') || '',
    zoneName: rec.get('home_zone_name') || '',
    rankLabel, xp,
    canWave: !!rec.get('accept_requests'),
  }
}

// Accounts that this viewer can't see / be seen by (blocked in EITHER direction).
function blockedSet(app, account) {
  const out = {}
  try { app.findRecordsByFilter('blocks', 'blocker_account = {:a}', '', 2000, 0, { a: account }).forEach((b) => { out[String(b.get('blocked_account'))] = true }) } catch (_) {}
  try { app.findRecordsByFilter('blocks', 'blocked_account = {:a}', '', 2000, 0, { a: account }).forEach((b) => { out[String(b.get('blocker_account'))] = true }) } catch (_) {}
  return out
}

function buildPeople(app, viewer, limit) {
  if (!ACCT_RE.test(String(viewer || ''))) throw new BadRequestError('bad request')
  const n = Math.max(1, Math.min(60, parseInt(limit, 10) || 40))
  const blocked = blockedSet(app, viewer)
  // outgoing waves from the viewer → mark each card's status (none|pending|accepted|declined)
  const sent = {}
  try { app.findRecordsByFilter('connections', 'from_account = {:a}', '', 2000, 0, { a: viewer }).forEach((c) => { sent[String(c.get('to_account'))] = c.get('status') || 'pending' }) } catch (_) {}
  let rows = []
  try { rows = app.findRecordsByFilter('profiles', 'discoverable = true', '-updated', n + 20, 0) } catch (_) {}
  const people = []
  for (const r of rows) {
    const acc = String(r.get('account_id') || '')
    if (!acc || acc === viewer || blocked[acc]) continue
    const card = personCard(app, r)
    card.waveStatus = sent[acc] || 'none'
    people.push(card)
    if (people.length >= n) break
  }
  return { people }
}

// Ensure a profile row exists for an account (mirrors saveIntro's upsert), returns the record.
function ensureProfile(app, account) {
  try { return app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account }) }
  catch (_) { const r = new Record(app.findCollectionByNameOrId('profiles')); r.set('account_id', account); return r }
}

function setPrivacy(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const rec = ensureProfile(app, account)
  if (body.discoverable !== undefined) rec.set('discoverable', !!body.discoverable)
  // The client always sends accept_requests alongside; default ON the first time we ever write it.
  if (body.accept_requests !== undefined) rec.set('accept_requests', !!body.accept_requests)
  else if (rec.get('accept_requests') === undefined) rec.set('accept_requests', true)
  app.save(rec)
  return { discoverable: !!rec.get('discoverable'), acceptRequests: !!rec.get('accept_requests') }
}

// Resolve a PUBLIC profile id → { rec, account }. Throws on unknown id.
function profileByPublicId(app, id) {
  let rec
  try { rec = app.findRecordById('profiles', String(id || '')) } catch (_) { throw new BadRequestError('unknown person') }
  return { rec, account: String(rec.get('account_id') || '') }
}

function sendWave(app, body) {
  const from = String(body.account_id || '')
  if (!ACCT_RE.test(from)) throw new BadRequestError('bad request')
  const { rec: target, account: to } = profileByPublicId(app, body.to)
  if (!to || to === from) throw new BadRequestError('bad request')
  if (!target.get('discoverable') || !target.get('accept_requests')) throw new BadRequestError('not accepting requests')
  // either-direction block bars the wave
  const blocked = blockedSet(app, from)
  if (blocked[to]) throw new BadRequestError('unavailable')
  // idempotent: a pair already exists → return its current status, never duplicate
  try {
    const existing = app.findFirstRecordByFilter('connections', 'from_account = {:f} && to_account = {:t}', { f: from, t: to })
    return { ok: true, status: existing.get('status') || 'pending' }
  } catch (_) { /* none yet */ }
  // per-account hourly wave cap
  const recent = app.findRecordsByFilter('connections', 'from_account = {:a} && created >= {:since}', '', 1000, 0, { a: from, since: pbTime(minutesAgo(60)) }).length
  if (recent >= WAVE_HOURLY) throw new BadRequestError('hourly limit reached — try again later')
  const rec = new Record(app.findCollectionByNameOrId('connections'))
  rec.set('from_account', from)
  rec.set('to_account', to)
  rec.set('kind', 'wave')
  rec.set('status', 'pending')
  try { app.save(rec) } catch (_) { /* unique pair race → already sent, benign */ }
  return { ok: true, status: 'pending' }
}

function buildRequests(app, account) {
  if (!ACCT_RE.test(String(account || ''))) throw new BadRequestError('bad request')
  let rows = []
  try { rows = app.findRecordsByFilter('connections', 'to_account = {:a} && status = "pending"', '-created', 100, 0, { a: account }) } catch (_) {}
  const blocked = blockedSet(app, account)
  const requests = []
  for (const c of rows) {
    const from = String(c.get('from_account') || '')
    if (blocked[from]) continue
    let sender
    try { sender = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: from }) } catch (_) { continue }
    const card = personCard(app, sender)
    requests.push({
      id: c.id, // connection record id — the handle to accept/decline
      personId: card.id, nickname: card.nickname, avatarId: card.avatarId,
      zoneName: card.zoneName, rankLabel: card.rankLabel,
      created: c.getString('created'), ago: relAgo(c.getString('created')),
    })
  }
  return { requests, count: requests.length }
}

function respondRequest(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const action = String(body.action || '')
  if (action !== 'accept' && action !== 'decline') throw new BadRequestError('bad action')
  let c
  try { c = app.findRecordById('connections', String(body.request || '')) } catch (_) { throw new BadRequestError('not found') }
  if (String(c.get('to_account')) !== account) throw new BadRequestError('forbidden') // only the recipient may respond
  c.set('status', action === 'accept' ? 'accepted' : 'declined')
  app.save(c)
  return { ok: true, status: c.get('status') }
}

function blockUser(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const { account: target } = profileByPublicId(app, body.target)
  if (!target || target === account) throw new BadRequestError('bad request')
  try { app.findFirstRecordByFilter('blocks', 'blocker_account = {:a} && blocked_account = {:t}', { a: account, t: target }) }
  catch (_) {
    const rec = new Record(app.findCollectionByNameOrId('blocks'))
    rec.set('blocker_account', account)
    rec.set('blocked_account', target)
    try { app.save(rec) } catch (_) { /* unique race, benign */ }
  }
  // tidy up any open waves between the two (either direction) → declined
  try {
    app.findRecordsByFilter('connections', '(from_account = {:a} && to_account = {:t}) || (from_account = {:t} && to_account = {:a})', '', 10, 0, { a: account, t: target })
      .forEach((c) => { if (c.get('status') === 'pending') { c.set('status', 'declined'); try { app.save(c) } catch (_) {} } })
  } catch (_) {}
  return { ok: true }
}

// ── Unique usernames registry ────────────────────────────────────────────────────────────────────
// Every public pseudonym is globally unique case-insensitively (the `usernames` collection has a DB
// UNIQUE index on name_lower). A name may be CHANGED, but only once per NAME_COOLDOWN_DAYS (FB-style).
// The registry maps a name → its owner account_id (server-only capability); it carries NO rl_key and
// is NEVER linked to reports. Reserved / abusive names are rejected.
const NAME_MIN = 3
const NAME_MAX = 20
const NAME_COOLDOWN_DAYS = 60
// 3–20 chars; letters/digits/space/._- inside; must start AND end with a letter or digit.
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 ._-]{1,18}[A-Za-z0-9])?$/
// Reserved handles + a small profanity core (substring match). Lowercase.
const NAME_BLOCKLIST = ['nawec', 'admin', 'administrator', 'official', 'gambiaoutage', 'gambia outage',
  'moderator', 'support', 'system', 'operator', 'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'cunt', 'rape']

function normName(raw) { return String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ') }
// '' when OK, else a reason code: 'invalid' | 'reserved'.
function nameFormatError(name) {
  const n = normName(name)
  if (n.length < NAME_MIN || n.length > NAME_MAX || !NAME_RE.test(n)) return 'invalid'
  const lo = n.toLowerCase()
  for (let i = 0; i < NAME_BLOCKLIST.length; i++) { if (lo.indexOf(NAME_BLOCKLIST[i]) !== -1) return 'reserved' }
  return ''
}
// Owner account_id (64-hex) currently registered for a lowercased name, or '' if free.
function nameOwner(app, lower) {
  try { const r = app.findFirstRecordByFilter('usernames', 'name_lower = {:n}', { n: lower }); return String(r.get('account') || '') }
  catch (_) { return '' }
}
// GET /name/check → { available, reason?, name }. `account` (optional) lets a user re-check their own.
function checkName(app, raw, account) {
  const name = normName(raw)
  const fmt = nameFormatError(name)
  if (fmt) return { available: false, reason: fmt, name }
  const lower = name.toLowerCase()
  let takenRec = null
  try { takenRec = app.findFirstRecordByFilter('usernames', 'name_lower = {:n}', { n: lower }) } catch (_) {}
  const owner = takenRec ? String(takenRec.get('account') || '') : ''
  if (owner && !(ACCT_RE.test(String(account)) && owner === account)) {
    const hasPassword = !!(takenRec && takenRec.get('pass_hash'))
    return { available: false, reason: 'taken', name, hasPassword }
  }
  return { available: true, name }
}
// POST /name/claim → { ok:true, name, nextChangeAt } on success, or { ok:false, reason, until? } on a
// business rejection (taken | reserved | invalid | cooldown). Throws only for a malformed account id.
function claimName(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const name = normName(body.name)
  const fmt = nameFormatError(name)
  if (fmt) return { ok: false, reason: fmt }
  const lower = name.toLowerCase()

  const owner = nameOwner(app, lower)
  if (owner && owner !== account) return { ok: false, reason: 'taken' }

  const prof = ensureProfile(app, account)
  const prevName = String(prof.get('nickname') || '').trim().replace(/\s+/g, ' ')
  const prevLower = prevName.toLowerCase()
  const isChange = !!prevLower && prevLower !== lower

  // Cooldown applies only to a genuine change of an already-set name.
  if (isChange) {
    const changedAt = parsePB(prof.get('name_changed_at'))
    if (changedAt) {
      const days = (Date.now() - changedAt.getTime()) / 86400000
      if (days < NAME_COOLDOWN_DAYS) {
        const until = new Date(changedAt.getTime() + NAME_COOLDOWN_DAYS * 86400000).toISOString()
        return { ok: false, reason: 'cooldown', until }
      }
    }
  }

  // Take ownership in the registry (idempotent if already ours); the DB unique index is the real guard.
  if (owner !== account) {
    const u = new Record(app.findCollectionByNameOrId('usernames'))
    u.set('name', name); u.set('name_lower', lower); u.set('account', account)
    try { app.save(u) } catch (_) { return { ok: false, reason: 'taken' } } // lost a race on the unique index
  }
  // Release my previous (different) name so others can claim it.
  if (isChange && prevLower) {
    try { const old = app.findFirstRecordByFilter('usernames', 'name_lower = {:n} && account = {:a}', { n: prevLower, a: account }); app.delete(old) } catch (_) {}
  }

  prof.set('nickname', name)
  if (isChange || !prof.get('name_changed_at')) prof.set('name_changed_at', new Date().toISOString())
  app.save(prof)

  const stamped = parsePB(prof.get('name_changed_at'))
  const nextChangeAt = stamped ? new Date(stamped.getTime() + NAME_COOLDOWN_DAYS * 86400000).toISOString() : ''
  return { ok: true, name, nextChangeAt }
}

// ── Auto-release of inactive names (anti-squatting GC, cron go_name_gc) ───────────────────────────
// A claimed name is freed for others ONLY when its owner account shows ZERO investment AND has been
// inactive for >= CFG.NAME_INACTIVE_DAYS. "Invested / active" → NEVER released = ANY of: a recovery
// password (on the usernames row), any claimed XP (xp_ledger), any social content (post/comment/
// question), or a People presence (a discoverable profile or any connection). Last-activity anchor =
// the most recent of the name claim (usernames.created) and a profile edit (profiles.updated).
// Releasing deletes the registry row AND clears the now-orphaned profile nickname, so the freed name
// disappears from every read-model (preserves the global display-uniqueness invariant). Backend-only:
// a returning squatter keeps the stale name in localStorage but gets `taken` if it was already reclaimed.
function accountHasXp(app, account) {
  try { return app.findRecordsByFilter('xp_ledger', 'account_id = {:a}', '', 1, 0, { a: account }).length > 0 }
  catch (_) { return false }
}
function accountHasSocial(app, account) {
  for (let i = 0; i < 3; i++) {
    const col = ['posts', 'comments', 'questions'][i]
    try { if (app.findRecordsByFilter(col, 'account_id = {:a}', '', 1, 0, { a: account }).length > 0) return true } catch (_) {}
  }
  try { if (app.findRecordsByFilter('connections', 'from_account = {:a} || to_account = {:a}', '', 1, 0, { a: account }).length > 0) return true } catch (_) {}
  return false
}
// Returns the number of names released. Safe to run repeatedly (idempotent — a released name is gone).
function releaseInactiveNames(app) {
  const days = CFG.NAME_INACTIVE_DAYS
  if (!(days > 0)) return 0 // disabled
  const cutoffMs = Date.now() - days * 86400000
  // DB-narrow to names claimed before the cutoff: a name claimed within the window is never released.
  let candidates = []
  try { candidates = app.findRecordsByFilter('usernames', 'created <= {:c}', 'created', 100000, 0, { c: pbTime(new Date(cutoffMs)) }) }
  catch (_) { candidates = [] }
  let released = 0
  for (const row of candidates) {
    const account = String(row.get('account') || '')
    if (!account) continue
    if (String(row.get('pass_hash') || '')) continue // protected: has a recovery password
    let prof = null
    try { prof = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account }) } catch (_) { prof = null }
    if (prof) {
      const pu = parsePB(prof.get('updated'))
      if (pu && pu.getTime() > cutoffMs) continue // profile edited within the window → still active
      if (prof.get('discoverable')) continue       // protected: visible in the People directory
    }
    if (accountHasXp(app, account)) continue        // protected: has earned XP
    if (accountHasSocial(app, account)) continue    // protected: posts/comments/questions/connections
    // Release: free the name and blank the orphaned nickname so it vanishes from every read-model.
    try { app.delete(row) } catch (_) { continue }
    released++
    if (prof) { try { prof.set('nickname', ''); prof.set('name_changed_at', ''); app.save(prof) } catch (_) {} }
  }
  return released
}

// ── Optional account recovery (name + password) ──────────────────────────────
// PII-free: the unique name is the identifier, the password the secret. Hash = salted, iterated
// sha256 stored as `salt$hash` on the usernames row. Online brute-force is stopped by a per-name
// lockout (5 fails → 15 min). The DB is never publicly exposed, so the iterated sha256 is adequate.
const PW_ITERS = 8000
const PW_MIN = 6
const PW_MAX = 72
const PW_MAX_FAILS = 5
const PW_LOCK_MIN = 15
function pwHashHex(password, salt) {
  let h = String(salt) + '$' + String(password)
  for (let i = 0; i < PW_ITERS; i++) h = $security.sha256(h)
  return h
}
function makePwHash(password) {
  const salt = $security.randomString(22)
  return salt + '$' + pwHashHex(password, salt)
}
function verifyPwHash(stored, password) {
  const s = String(stored || '')
  const i = s.indexOf('$')
  if (i < 0) return false
  const salt = s.slice(0, i)
  const want = s.slice(i + 1)
  return $security.equal(pwHashHex(password, salt), want)
}
function userRowByAccount(app, account) {
  try { return app.findFirstRecordByFilter('usernames', 'account = {:a}', { a: account }) } catch (_) { return null }
}
// Set/replace the recovery password for the caller's account. Requires a claimed name.
function setAccountPassword(app, body) {
  const account = String(body.account_id || '')
  if (!ACCT_RE.test(account)) throw new BadRequestError('bad request')
  const pw = String(body.password == null ? '' : body.password)
  if (pw.length < PW_MIN || pw.length > PW_MAX) return { ok: false, reason: 'invalid' }
  const row = userRowByAccount(app, account)
  if (!row) return { ok: false, reason: 'no_name' } // must claim a unique name first
  row.set('pass_hash', makePwHash(pw))
  row.set('pw_fails', 0)
  row.set('pw_locked_until', '')
  app.save(row)
  return { ok: true }
}
// Whether the caller's account has a recovery password set (drives the Profile UI).
function accountStatus(app, account) {
  if (!ACCT_RE.test(String(account))) throw new BadRequestError('bad request')
  const row = userRowByAccount(app, account)
  return { hasPassword: !!(row && row.get('pass_hash')), name: row ? String(row.get('name') || '') : '' }
}
// Recover an account by name + password. Returns the account_id capability (+ profile bits) so the new
// device can adopt it. Generic errors + per-name lockout to resist online guessing.
function recoverAccount(app, body) {
  const name = normName(body.name)
  const pw = String(body.password == null ? '' : body.password)
  if (!name || pw.length < PW_MIN) return { ok: false, reason: 'invalid' }
  let row
  try { row = app.findFirstRecordByFilter('usernames', 'name_lower = {:n}', { n: name.toLowerCase() }) } catch (_) { row = null }
  if (!row || !row.get('pass_hash')) return { ok: false, reason: 'invalid' } // don't reveal which part failed
  const lockedUntil = parsePB(row.get('pw_locked_until'))
  if (lockedUntil && lockedUntil.getTime() > Date.now()) return { ok: false, reason: 'locked', until: lockedUntil.toISOString() }
  if (!verifyPwHash(row.get('pass_hash'), pw)) {
    const fails = (parseInt(row.get('pw_fails'), 10) || 0) + 1
    row.set('pw_fails', fails)
    if (fails >= PW_MAX_FAILS) row.set('pw_locked_until', new Date(Date.now() + PW_LOCK_MIN * 60000).toISOString())
    try { app.save(row) } catch (e) { app.logger().error('recover fail-save', 'err', String(e)) }
    return { ok: false, reason: 'invalid' }
  }
  // success → reset the lockout counters
  row.set('pw_fails', 0); row.set('pw_locked_until', '')
  try { app.save(row) } catch (_) {}
  const account = String(row.get('account') || '')
  // restore self-declared profile bits (device-local on the old phone, mirrored on profiles)
  let avatarId = '', bio = '', homeZone = '', nextChangeAt = ''
  try {
    const prof = app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: account })
    if (prof) {
      avatarId = String(prof.get('avatar_id') || '')
      bio = String(prof.get('bio') || '')
      homeZone = String(prof.get('home_zone') || '')
      const ca = parsePB(prof.get('name_changed_at'))
      if (ca) nextChangeAt = new Date(ca.getTime() + NAME_COOLDOWN_DAYS * 86400000).toISOString()
    }
  } catch (_) {}
  return { ok: true, account_id: account, name: String(row.get('name') || ''), avatarId, bio, homeZone, nextChangeAt }
}

// ── Owner-curated external posts (Telegram ingest → "From Facebook" cards) ───────────────────────
function socialLinkShape(r) {
  const img = r.get('image')
  const author = r.get('author') || '' // source page / profile name (e.g. "InsideGambia.com")
  // origin: how the row was ingested. 'auto' = machine-monitored from a known Gambian page
  // (tooling/fb-monitor); anything else (incl. legacy '') = owner hand-picked via the Telegram bot.
  const origin = r.get('origin') === 'auto' ? 'auto' : 'curated'
  return {
    id: r.id,
    url: r.get('url') || '',
    title: r.get('title') || '',
    author,
    snippet: r.get('snippet') || '',
    // single-file field → relative PB file URL (same origin); '' when no image
    image: img ? `/api/files/social_links/${r.id}/${img}` : '',
    source: r.get('source') || 'link',
    pinned: !!r.get('pinned'),
    likes: r.get('likes') || 0,
    isLive: !!r.get('is_live'),
    platform: r.get('platform') || (r.get('source') === 'facebook' ? 'facebook' : 'link'),
    liveExpiresAt: r.getString('live_expires_at') || '',
    created: r.getString('created'),
    ago: relAgo(r.getString('created')),
    origin, // 'auto' | 'curated' → drives the discreet "auto-tracked" UI affordance
    trusted: origin === 'auto', // came from a known, monitored Gambian page (verified source mark)
    official: /nawec/i.test(author), // NAWEC = the national electricity utility (official source)
  }
}
function buildSocial(app, limit) {
  const n = Math.max(1, Math.min(50, parseInt(limit, 10) || 30))
  // pinned first, then newest. Read-only curated feed; only the bot (superuser) writes these rows.
  const rows = app.findRecordsByFilter('social_links', 'hidden = false', '-pinned,-created', n, 0)
  const shaped = rows.map(socialLinkShape)
  // split the stream: active live streams power the "LIVE now" strip, the rest are From-Facebook cards.
  return { lives: shaped.filter((x) => x.isLive), links: shaped.filter((x) => !x.isLive) }
}

// Register one anonymous 'like' on a From-Facebook card (social-proof signal, "others are here").
// Dedupe by the daily rl_key: one like per device-day per post. rl_key rotates daily → not a
// permanent lock (consistent with the report floor); NO account_id, NO link to the device's
// reports/profile. Idempotent: a repeat from the same device-day returns the current count.
function likeSocial(app, id, realIP, ua) {
  let link
  try { link = app.findRecordById('social_links', String(id)) } catch (_) { throw new Error('not found') }
  if (link.get('hidden')) throw new Error('not found')
  const rlk = rlKey(app, realIP, ua)
  try {
    const row = new Record(app.findCollectionByNameOrId('social_likes'))
    row.set('link', link.id)
    row.set('rl_key', rlk)
    app.save(row)
  } catch (_) {
    // unique (link, rl_key) clash → already liked today; idempotent no-op.
    return { id: link.id, likes: link.get('likes') || 0, liked: true }
  }
  // new distinct like → bump the denormalised counter (re-read fresh to minimise lost updates).
  let cur
  try { cur = app.findRecordById('social_links', link.id) } catch (_) { cur = link }
  const next = (cur.get('likes') || 0) + 1
  cur.set('likes', next)
  app.save(cur)
  return { id: link.id, likes: next, liked: true }
}

// ── Community link submissions ("Dai cittadini") — user-submitted FB/TikTok links ───────────────
// Distinct from the owner-curated social_links. Created via the public records API + a create hook
// (go_community_links.pb.js) that validates/forces fields. Attributed to the device pseudonym;
// NO rl_key on the row, NO link to reports. Likes/Reports are anonymous (daily rl_key dedupe only).

// Derive the platform from the URL host; null ⇒ not an accepted domain (rejected upstream).
// ⚠ PB JSVM (goja) has NO `URL` constructor — parse the host with a regex, not `new URL()`.
function communityLinkPlatform(url) {
  const m = String(url || '').match(/^https?:\/\/([^/?#]+)/i)
  if (!m) return null
  const host = m[1].toLowerCase().replace(/^www\./, '')
  if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.watch' || host === 'fb.com') return 'facebook'
  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return 'tiktok'
  return null
}
function communityLinkShape(app, r) {
  const img = r.get('image')
  return {
    id: r.id,
    url: r.get('url') || '',
    platform: r.get('platform') || 'link',
    source: r.get('platform') || 'link',
    caption: r.get('caption') || '',
    title: r.get('caption') || '',
    image: img ? `/api/files/community_links/${r.id}/${img}` : '',
    nickname: r.get('nickname') || '',
    avatarId: r.get('avatar_id') || '',
    likes: r.get('likes') || 0,
    created: r.getString('created'),
    ago: relAgo(r.getString('created')),
  }
}
function buildCommunityLinks(app, limit) {
  const n = Math.max(1, Math.min(50, parseInt(limit, 10) || 30))
  const rows = app.findRecordsByFilter('community_links', 'hidden = false', '-created', n, 0)
  return { links: rows.map((r) => communityLinkShape(app, r)) }
}
// one anonymous like per device-day per community link (mirrors likeSocial; NO account_id).
function likeCommunityLink(app, id, realIP, ua) {
  let link
  try { link = app.findRecordById('community_links', String(id)) } catch (_) { throw new Error('not found') }
  if (link.get('hidden')) throw new Error('not found')
  const rlk = rlKey(app, realIP, ua)
  try {
    const row = new Record(app.findCollectionByNameOrId('community_link_likes'))
    row.set('link', link.id); row.set('rl_key', rlk)
    app.save(row)
  } catch (_) {
    return { id: link.id, likes: link.get('likes') || 0, liked: true } // dup → idempotent
  }
  let cur
  try { cur = app.findRecordById('community_links', link.id) } catch (_) { cur = link }
  const next = (cur.get('likes') || 0) + 1
  cur.set('likes', next); app.save(cur)
  return { id: link.id, likes: next, liked: true }
}
// one anonymous abuse report per device-day per link; auto-hide at COMMUNITY_LINK_REPORT_FLOOR
// DISTINCT reporters. NO account_id — the report stream stays anonymous like the likes. Sybil-hardened
// (2026-06-09): rl_key embeds the attacker-controlled UA, so one IP rotating UAs could otherwise mint
// the floor in distinct rl_keys and censor a legit post. The auto-hide now requires the floor in
// distinct IPs (ip_key), so a single network can never hide a card on its own.
function reportCommunityLink(app, id, realIP, ua) {
  let link
  try { link = app.findRecordById('community_links', String(id)) } catch (_) { throw new Error('not found') }
  const rlk = rlKey(app, realIP, ua)
  const ipk = ipKey(app, realIP)
  try {
    const row = new Record(app.findCollectionByNameOrId('community_link_reports'))
    row.set('link', link.id); row.set('rl_key', rlk); row.set('ip_key', ipk)
    app.save(row)
  } catch (_) {
    return { id: link.id, hidden: !!link.get('hidden') } // dup → idempotent
  }
  const rows = app.findRecordsByFilter('community_link_reports', 'link = {:l}', '', 5000, 0, { l: link.id })
  const count = rows.length
  // distinct networks (legacy rows without ip_key fall back to their rl_key bucket, never undercounting)
  const ipset = {}
  rows.forEach((r) => { ipset[r.get('ip_key') || 'legacy:' + r.get('rl_key')] = 1 })
  const distinctIPs = Object.keys(ipset).length
  let cur
  try { cur = app.findRecordById('community_links', link.id) } catch (_) { cur = link }
  cur.set('report_count', count)
  if (distinctIPs >= CFG.COMMUNITY_LINK_REPORT_FLOOR) cur.set('hidden', true)
  app.save(cur)
  return { id: link.id, hidden: !!cur.get('hidden') }
}

// Admin moderation view of community links (INCLUDING hidden ones) + a hide/unhide mutation.
// Superuser-gated by the route ($apis.requireSuperuserAuth()).
function adminCommunityLinks(app, limit) {
  const n = Math.max(1, Math.min(200, parseInt(limit, 10) || 50))
  let rows = []
  try { rows = app.findRecordsByFilter('community_links', "id != ''", '-created', n, 0) } catch (_) {}
  return rows.map((r) => {
    const img = r.get('image')
    return {
      id: r.id, caption: r.get('caption') || '', url: r.get('url') || '', platform: r.get('platform') || '',
      nickname: r.get('nickname') || '', likes: r.get('likes') || 0, reportCount: r.get('report_count') || 0,
      hidden: !!r.get('hidden'), image: img ? `/api/files/community_links/${r.id}/${img}` : '',
      created: r.getString('created'), ago: relAgo(r.getString('created')),
    }
  })
}
function setCommunityLinkHidden(app, id, hidden) {
  let r
  try { r = app.findRecordById('community_links', String(id)) } catch (_) { throw new Error('not found') }
  r.set('hidden', !!hidden)
  app.save(r)
  return { id: r.id, hidden: !!r.get('hidden') }
}

// Superuser moderation — soft-hide ANY user-generated content by type. All these collections carry a
// `hidden` bool and the public read-models filter on `hidden = false`, so setting it true drops the
// row from every surface immediately (and false restores it). Superuser-gated at the route layer.
const MOD_COLLECTIONS = {
  comment: 'comments',
  question: 'questions',
  post: 'posts',
  community_link: 'community_links',
  social_link: 'social_links',
}
function setContentHidden(app, type, id, hidden) {
  const col = MOD_COLLECTIONS[String(type)]
  if (!col) throw new Error('bad type')
  let r
  try { r = app.findRecordById(col, String(id)) } catch (_) { throw new Error('not found') }
  r.set('hidden', !!hidden)
  app.save(r)
  return { type: String(type), id: r.id, hidden: !!r.get('hidden') }
}

module.exports = {
  CFG, pbTime, minutesAgo, midnightUTC, dayStr, parsePB, haversineKm,
  dailySalt, rlKey, ipKey, sanitiseNote, sanitiseText, rateLimitReason, turnstileEnabled, verifyTurnstile,
  distinctReporters60m, geoAllowed, geoCountryFromHeaders,
  opsHeartbeat, opsHealth, bodyTooLarge,
  buildHourly,
  createPost, createComment, saveIntro, socialProfile, buildFeed, buildZoneComments, buildComments,
  createQuestion, buildQuestions, buildQuestionThread, questionShape, updateQuestion, deleteQuestion,
  modDelete, isModeratorAccount,
  buildSocial, likeSocial,
  communityLinkPlatform, communityLinkShape, buildCommunityLinks, likeCommunityLink, reportCommunityLink, ACCT_RE, cleanNick, cleanAvatar, socialRateLimited,
  openEvent, distinctOut60m, distinctBack60m, countReports, snapZone,
  mergeOut, mergeBack, refreshEventConfidence, writeDailyStat,
  todayMin, deriveZone, buildSnapshot, buildNational, buildMacro,
  writeReadModel, recompute, recomputeAll,
  decayRefresh, autoCloseStale, rotateSalt,
  enqueueBackPush, enqueueOutPush, subscribePush, unsubscribePush, subRlCheck,
  // Phase 5 — Community / Wall of Honor
  isoWeekId, weekBounds, prevWeekId, watchStreak,
  deriveCommunity, recomputeCommunity, freezeWeek, buildCommunityWeek,
  firstWitnessLabel, lightBackEntry,
  // Admin ops dashboard (/admin)
  buildAdminOverview, recentReports, adminCommunityLinks, setCommunityLinkHidden, setContentHidden,
  // Gamification — anonymous profile + XP
  RANKS, rankFor, mintGrant, claimGrant, buildProfile, buildStats,
  // People directory — opt-in neighbour discovery + waves
  buildPeople, setPrivacy, sendWave, buildRequests, respondRequest, blockUser,
  // Unique usernames registry (forced + 60-day change cooldown) + inactive-name GC
  checkName, claimName, setAccountPassword, accountStatus, recoverAccount, releaseInactiveNames,
}
