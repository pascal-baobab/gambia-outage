/// <reference path="../pb_data/types.d.ts" />
// reports_create.pb.js — Phase 1 anonymous report pipeline (§4.2/§4.3).
// onRecordCreateRequest('reports'): rl_key, rate-limit, client_uuid dedupe, sanitise,
// GPS snap → canonical zone, then (post-persist) merge into the zone's open event and
// recompute the affected read-models. All logic lives in lib/go.js; required INSIDE the
// handler because the PB JSVM runs each hook in an isolated runtime (can't see file scope).

onRecordCreateRequest((e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const r = e.record
  // 0) M2 anti-abuse: refuse oversized bodies before any parsing/DB work.
  if (go.bodyTooLarge(e)) throw new BadRequestError('request body too large')

  const info = e.requestInfo()
  const body = (info && info.body) || {}

  // 1) identity (anonymous, never returned) ----------------------------------
  let realIP = 'dev-local'
  try { realIP = e.realIP() || realIP } catch (_) {}
  let ua = ''
  try { ua = (info.headers && (info.headers.user_agent || info.headers['user-agent'])) || '' } catch (_) {}
  const rlk = go.rlKey(e.app, realIP, ua)
  // Network-layer key (no attacker-controlled UA) — basis of the per-IP cap + Sybil-capped
  // distinct-reporter counts. Same anonymity class as rl_key, stored only on this non-public row.
  const ipk = go.ipKey(e.app, realIP)

  // 2) type (out|back) -------------------------------------------------------
  const type = r.get('type')
  if (type !== 'out' && type !== 'back') throw new BadRequestError('type must be out|back')

  // 2.1) Geo-gate — outage reports may only originate inside The Gambia (CF-IPCountry, forwarded by
  // the tunnel). Rejected early, before any DB work. Fails open when the country is unknown (dev/local
  // /Tor) so tooling + the seed still work. Toggle/allowlist via GEO_GATE / GEO_ALLOW in /root/.env.
  const country = go.geoCountryFromHeaders(info.headers)
  if (!go.geoAllowed(country)) {
    throw new BadRequestError('reporting is only available from inside The Gambia')
  }

  // 2.5) Turnstile (anti-bot) — enforced only when TURNSTILE_SECRET is set (prod). Rejected
  // early, before any DB work, so bot floods are cheap to refuse. No-op in dev/local.
  const tsToken = (body.cf_turnstile_token || '').toString()
  if (!go.verifyTurnstile(e.app, tsToken, realIP)) {
    throw new BadRequestError('challenge failed — please try again')
  }

  // 3) resolve canonical zone: explicit pick wins; else snap GPS -------------
  let zoneId = r.get('zone')
  const lat = Number(body.lat != null ? body.lat : r.get('lat'))
  const lng = Number(body.lng != null ? body.lng : r.get('lng'))
  const hasGPS = isFinite(lat) && isFinite(lng) && (lat !== 0 || lng !== 0)
  if (!zoneId && hasGPS) zoneId = go.snapZone(e.app, lat, lng)
  if (!zoneId) throw new BadRequestError('no zone: pick an area or enable GPS')
  r.set('zone', zoneId)

  // 4) client_uuid offline dedupe — replaying a queued report is a no-op -----
  // M2 hardening: validate the shape (UUID-like charset) instead of blind-slicing arbitrary input.
  const cu = (body.client_uuid || r.get('client_uuid') || '').toString()
  if (cu && !/^[A-Za-z0-9-]{8,64}$/.test(cu)) throw new BadRequestError('bad client_uuid')
  if (cu) {
    r.set('client_uuid', cu)
    const dup = e.app.findRecordsByFilter('reports', 'client_uuid = {:c}', '', 1, 0, { c: cu })
    if (dup.length) throw new BadRequestError('duplicate client_uuid (already applied)')
  }

  // 5) rate-limit (hourly cap + ≤1 OUT/zone/window) --------------------------
  const blocked = go.rateLimitReason(e.app, rlk, zoneId, type, ipk)
  if (blocked) throw new BadRequestError(blocked)

  // 6) sanitise + privacy + stamp SERVER-controlled fields -------------------
  r.set('note', go.sanitiseNote(r.get('note')))
  r.set('rl_key', rlk)
  r.set('ip_key', ipk)
  r.set('hidden', false)
  // P1-7: never trust client-set moderation / event-link fields
  r.set('flagged', false)
  r.set('event', null)
  // P0-1: GPS privacy AT REST — coarsen precise GPS to ~1km (2 dp) for GPS reports; the snap in
  // step 3 already used the precise value, so nothing downstream needs the exact coordinate.
  // Manual picks carry no meaningful GPS → drop it entirely.
  if (r.get('source') === 'gps' && hasGPS) {
    r.set('lat', Math.round(lat * 100) / 100)
    r.set('lng', Math.round(lng * 100) / 100)
  } else {
    r.set('lat', null)
    r.set('lng', null)
  }

  // 7) persist the report ----------------------------------------------------
  e.next()

  // 8) merge into the zone event + recompute read-models ---------------------
  try {
    // capture pre-merge state for first-witness / first-back badge decisions
    let wasOpen = false, priorBack = 0
    // NOTE: priorBack uses the event's distinct-back snapshot (back_confirmations), which ages out
    // with the 60-min window — so 'light_spotter' (first-back) can be re-awarded if the first back
    // aged out. Accepted: it's a benign XP over-grant, never a double-credit (nonce-unique) nor a
    // privacy issue. Strict "first-ever back" would need a dedicated flag on the event.
    try {
      const pre = go.openEvent(e.app, zoneId)
      if (pre) { wasOpen = true; priorBack = pre.get('back_confirmations') || 0 }
    } catch (_) {}

    if (type === 'out') {
      const ev = go.mergeOut(e.app, zoneId)
      go.refreshEventConfidence(e.app, ev)
    } else {
      go.mergeBack(e.app, zoneId)
    }
    go.recompute(e.app, zoneId)

    // gamification: mint an unclaimed XP credit keyed by the client's claim_nonce (decoupled —
    // no link to this report row). Best-effort; never fail the report on a mint error.
    try {
      go.mintGrant(e.app, { type, claimNonce: (body.claim_nonce || '').toString(), state: { wasOpen, priorBack } })
    } catch (err) {
      e.app.logger().error('xp mintGrant failed', 'err', String(err))
    }
  } catch (err) {
    e.app.logger().error('reports_create post-merge failed', 'err', String(err))
  }
}, 'reports')
