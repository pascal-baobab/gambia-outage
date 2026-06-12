/// <reference path="../pb_data/types.d.ts" />
// go_social.pb.js — public read-model for owner-curated external posts ("From Facebook"). Rows are
// written ONLY by the Telegram bot sidecar (superuser, loopback); this route just exposes a curated,
// non-enumerable shape. Matches /api/go/* so it inherits the ~edge cache. Generic {message} errors.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE the handler; use global $app.
routerAdd('GET', '/api/go/social', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let limit = ''
    try { limit = (e.requestInfo().query && e.requestInfo().query.limit) || '' } catch (_) {}
    return e.json(200, go.buildSocial($app, limit))
  } catch (err) {
    $app.logger().error('social route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// POST /api/go/social/like {id} — one anonymous like per device-day per post (social proof).
// Dedupe by the daily rl_key; NO account_id, NO link to the device's reports. Idempotent.
routerAdd('POST', '/api/go/social/like', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const body = (info && info.body) || {}
    const id = (body.id || '').toString()
    if (!id) return e.json(400, { message: 'id required' })
    let realIP = 'dev-local'
    try { realIP = e.realIP() || realIP } catch (_) {}
    let ua = ''
    try { ua = (info.headers && (info.headers.user_agent || info.headers['user-agent'])) || '' } catch (_) {}
    return e.json(200, go.likeSocial($app, id, realIP, ua))
  } catch (err) {
    const msg = String(err)
    if (msg.indexOf('not found') >= 0) return e.json(404, { message: 'not found' })
    $app.logger().error('social like failed', 'err', msg)
    return e.json(500, { message: 'internal error' })
  }
})
