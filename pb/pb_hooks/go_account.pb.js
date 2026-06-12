/// <reference path="../pb_data/types.d.ts" />
// go_account.pb.js — optional, PII-free account recovery (name + password). No phone, no email.
//
//   POST /api/go/account/set-password {account_id, password} → { ok } | { ok:false, reason }
//   GET  /api/go/account/status?account=<id>                 → { hasPassword, name }
//   POST /api/go/account/recover     {name, password}        → { ok, account_id, name, avatarId, bio, homeZone, nextChangeAt } | { ok:false, reason, until? }
//
// All logic in lib/go.js. ⚠ PB JSVM: route handlers run isolated → require lib/go.js INSIDE each.
routerAdd('POST', '/api/go/account/set-password', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.setAccountPassword($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('set-password failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? 'bad request' : 'internal error' })
  }
})

routerAdd('GET', '/api/go/account/status', (e) => {
  const info = e.requestInfo()
  let account = (info && info.query && info.query.account) || ''
  if (!account) {
    // Fallback parser for PB versions where requestInfo() misses GET query args. Logged so a
    // protocol mismatch after a PB upgrade is visible instead of silently degrading (M2 hardening).
    try { account = e.request.url.query().get('account') || '' } catch (_) {}
    if (account) $app.logger().info('account/status: query read via url fallback')
  }
  // M2 hardening: the capability is always 64 lowercase hex — reject anything else before any DB work.
  account = String(account).toLowerCase().trim()
  if (account && !/^[0-9a-f]{64}$/.test(account)) return e.json(400, { message: 'bad request' })
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, go.accountStatus($app, account))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('account status failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? 'bad request' : 'internal error' })
  }
})

routerAdd('POST', '/api/go/account/recover', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.recoverAccount($app, body))
  } catch (err) {
    $app.logger().error('recover failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})
