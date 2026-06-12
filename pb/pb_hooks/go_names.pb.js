/// <reference path="../pb_data/types.d.ts" />
// go_names.pb.js — forced, globally-unique public pseudonyms.
//
//   GET  /api/go/name/check?name=<x>[&account=<id>] → { available, reason?, name }
//   POST /api/go/name/claim {account_id, name}      → { ok, name, nextChangeAt } | { ok:false, reason, until? }
//
// Uniqueness is case-insensitive (the `usernames` registry has a DB UNIQUE index on name_lower); a name
// may be changed once per 60 days. The registry maps name → owner account_id (server-only capability),
// carries NO rl_key and is NEVER linked to reports. All logic in lib/go.js.
//
// ⚠ PB JSVM: route handlers run in an ISOLATED runtime and CANNOT see file-scope consts/functions — so
// query parsing + the error envelope are inlined per handler; require lib/go.js INSIDE each handler.

routerAdd('GET', '/api/go/name/check', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    let name = (info && info.query && info.query.name) || ''
    let account = (info && info.query && info.query.account) || ''
    if (!name) { try { const u = e.request.url.query(); name = u.get('name') || ''; account = account || (u.get('account') || '') } catch (_) {} }
    return e.json(200, go.checkName($app, String(name), String(account)))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('name check failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/name/claim', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.claimName($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('name claim failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})
