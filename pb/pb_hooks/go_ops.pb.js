/// <reference path="../pb_data/types.d.ts" />
// go_ops.pb.js — public ops health endpoint (M1 ops hardening, docs/plans/M1-ops-hardening.md).
// GET /api/go/ops/health → { ok, heartbeat_age_sec, last_report_age_sec }
// ok=false when the go_decay cron heartbeat is older than 15 min (cron death / read-model staleness).
// No auth: exposes no secrets and no per-user data — built for an external uptime monitor that
// alerts on non-200 or on the literal `"ok":false` in the body. Deliberately NOT micro-cached
// concerns: a 10s edge micro-cache on /api/go/* is harmless at a 1-5 min polling cadence.
// NB (PB JSVM isolation): require() inside the handler.
routerAdd('GET', '/api/go/ops/health', (e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const h = go.opsHealth($app)
  return e.json(h.ok ? 200 : 503, h)
})

// Geo-gate diagnostics: what country (CF-IPCountry) does the origin see for THIS caller, and would
// the report geo-gate allow it? Exposes only the caller's own 2-letter country — no stored data.
// Empty country in prod ⇒ Cloudflare "IP Geolocation" is OFF in the dashboard (the gate fails OPEN).
routerAdd('GET', '/api/go/ops/geo', (e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const info = e.requestInfo()
  const country = go.geoCountryFromHeaders(info && info.headers)
  return e.json(200, { country: country || null, allowed: go.geoAllowed(country), gate: go.CFG.GEO_GATE })
})
