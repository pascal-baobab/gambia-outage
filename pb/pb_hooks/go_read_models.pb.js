/// <reference path="../pb_data/types.d.ts" />
// go_read_models.pb.js — public read-model routes (§3). Serves the precomputed `read_models`
// rows written by the report hook + crons; falls back to a live build when a row is missing
// (cold start before the first report/cron — yields the launch baseline, every zone 'on').
// Shapes match prompt §3 verbatim.
//
// ⚠ PB JSVM gotcha (TWICE bitten): routerAdd handlers run in an ISOLATED runtime. They CANNOT
// see file-scope consts/functions — so the read_models lookup is INLINED in each handler, and
// lib/go.js is require()d INSIDE the handler for the cold-start fallback. (require works inside
// handlers; a plain file-scope `function readModel(){}` does NOT — it throws "not defined".)
// Also: use the global `$app` for data access; the route event's `e.app` lacks these methods.

routerAdd('GET', '/api/go/snapshot', (e) => {
  try {
    let data = null
    try { data = $app.findFirstRecordByFilter('read_models', "key = 'snapshot'").get('data') } catch (_) {}
    if (!data) { const go = require(`${__hooks}/lib/go.js`); data = go.buildSnapshot($app) }
    return e.json(200, data)
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

routerAdd('GET', '/api/go/national', (e) => {
  try {
    let data = null
    try { data = $app.findFirstRecordByFilter('read_models', "key = 'national'").get('data') } catch (_) {}
    if (!data) { const go = require(`${__hooks}/lib/go.js`); data = go.buildNational($app) }
    return e.json(200, data)
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

routerAdd('GET', '/api/go/macro/{id}', (e) => {
  try {
    const id = e.request.pathValue('id')
    let data = null
    try { data = $app.findFirstRecordByFilter('read_models', 'key = {:k}', { k: `macro:${id}` }).get('data') } catch (_) {}
    if (!data) {
      try { $app.findRecordById('zones', id) } catch (_) { return e.json(404, { message: 'zone not found' }) }
      const go = require(`${__hooks}/lib/go.js`)
      data = go.buildMacro($app, id)
    }
    return e.json(200, data)
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// GET /api/go/quarters — flat directory of all settlements with centroids, for client-side
// reverse-geocode (GPS → nearest quarter name) + typeable search in the report sheet. Tiny
// (<6KB), centroids are static, so it's a plain zones read (no read_models row needed).
routerAdd('GET', '/api/go/quarters', (e) => {
  try {
    const rows = $app.findRecordsByFilter('zones', "level = 'settlement'", 'name', 2000, 0)
    const quarters = rows.map((q) => ({
      id: q.id,
      name: q.get('name'),
      regionId: q.get('parent'),
      region: q.get('display_region'),
      lat: q.get('lat'),
      lng: q.get('lng'),
    }))
    return e.json(200, { quarters })
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// GET /api/go/community — live current-week Wall of Honor (Hours in the Dark + Civic Voice).
// Served from the precomputed read_models row (rewritten by go_decay); cold-start fallback builds live.
routerAdd('GET', '/api/go/community', (e) => {
  try {
    let data = null
    try { data = $app.findFirstRecordByFilter('read_models', "key = 'community'").get('data') } catch (_) {}
    if (!data) { const go = require(`${__hooks}/lib/go.js`); data = go.deriveCommunity($app) }
    return e.json(200, data)
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// GET /api/go/community/week/{weekId} — a frozen weekly board from weekly_honors (incl. the
// illustrative 2026-W22 seed). 404 if no rows exist for that week.
routerAdd('GET', '/api/go/community/week/{weekId}', (e) => {
  try {
    const weekId = e.request.pathValue('weekId')
    const go = require(`${__hooks}/lib/go.js`)
    const data = go.buildCommunityWeek($app, weekId)
    if (!data) return e.json(404, { message: 'no honors for that week' })
    return e.json(200, data)
  } catch (err) {
    $app.logger().error('read-model route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// GET /api/go/turnstile — public Turnstile site key + enabled flag (mirrors /api/go/vapid). The
// site key is public by design; the secret stays server-side. enabled=false ⇒ client skips the
// challenge (dev/local), so the report flow keeps working without Turnstile configured.
routerAdd('GET', '/api/go/turnstile', (e) => {
  const k = $os.getenv('TURNSTILE_SITE_KEY') || ''
  return e.json(200, { siteKey: k, enabled: k !== '' })
})
