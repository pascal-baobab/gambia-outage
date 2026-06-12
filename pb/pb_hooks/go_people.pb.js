/// <reference path="../pb_data/types.d.ts" />
// go_people.pb.js — the opt-in "People / Persone vicine" routes (Community tab + Profile setup).
//
//   GET  /api/go/people?account=<id>            → discoverable neighbours (excl. self/blocked) + my wave status
//   POST /api/go/people/privacy {account_id, discoverable, accept_requests} → my visibility/contact switches
//   POST /api/go/people/wave    {account_id, to:<profileId>}                → send a "wave" (saluta) request
//   GET  /api/go/people/requests?account=<id>   → my incoming pending waves + a badge count
//   POST /api/go/people/respond {account_id, request:<connId>, action}      → accept | decline a wave
//   POST /api/go/people/block   {account_id, target:<profileId>}            → block a person (both ways)
//
// Pseudonym-only graph (account_id capability); NEVER linked to reports; account_id never leaves the
// server (people are addressed by their PROFILE RECORD ID). All logic in lib/go.js.
//
// ⚠ PB JSVM: route handlers run in an ISOLATED runtime and CANNOT see file-scope consts/functions —
// so EVERYTHING is inlined per handler (query parsing + error envelope). Only PB globals ($app,
// routerAdd, BadRequestError) and the require()'d `go` module are reachable. require lib/go.js INSIDE
// each handler. (A shared helper here would throw ReferenceError on the error path → generic 400.)

routerAdd('GET', '/api/go/people', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    let account = (info && info.query && info.query.account) || ''
    let limit = (info && info.query && info.query.limit) || ''
    if (!account) { try { const u = e.request.url.query(); account = u.get('account') || ''; limit = limit || (u.get('limit') || '') } catch (_) {} }
    return e.json(200, go.buildPeople($app, String(account), limit))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people list failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/people/privacy', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.setPrivacy($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people privacy failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/people/wave', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.sendWave($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people wave failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('GET', '/api/go/people/requests', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    let account = (info && info.query && info.query.account) || ''
    if (!account) { try { account = e.request.url.query().get('account') || '' } catch (_) {} }
    return e.json(200, go.buildRequests($app, String(account)))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people requests failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/people/respond', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.respondRequest($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people respond failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})

routerAdd('POST', '/api/go/people/block', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.blockUser($app, body))
  } catch (err) {
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('people block failed', 'err', String(err))
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})
