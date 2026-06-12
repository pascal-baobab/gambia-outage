/// <reference path="../pb_data/types.d.ts" />
// go_community_ugc.pb.js — community UGC routes: Outage stories (posts), per-zone comments,
// and the self-intro profile. Persistent-pseudonym social layer (account_id + nickname + avatar);
// NEVER linked to the anonymous reports. Moderation = automatic (sanitise + per-account caps in
// lib/go.js). Generic {message} errors; bad input → 400, transient → 500.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE each handler; use global $app.

function badOr500(e, err) {
  const code = err instanceof BadRequestError ? 400 : 500
  if (code === 500) $app.logger().error('community ugc route failed', 'err', String(err))
  return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
}

routerAdd('POST', '/api/go/posts', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.createPost($app, body))
  } catch (err) { return badOr500(e, err) }
})

routerAdd('GET', '/api/go/feed', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let limit = ''
    try { limit = (e.requestInfo().query && e.requestInfo().query.limit) || '' } catch (_) {}
    return e.json(200, go.buildFeed($app, limit))
  } catch (err) { return badOr500(e, err) }
})

routerAdd('POST', '/api/go/comments', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.createComment($app, body))
  } catch (err) { return badOr500(e, err) }
})

routerAdd('GET', '/api/go/comments', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const q = (info && info.query) || {}
    let tt = q.target_type || ''
    let ti = q.target_id || ''
    let zone = q.zone || ''
    if (!ti && !zone) { try { const u = e.request.url.query(); ti = u.get('target_id') || ''; tt = tt || (u.get('target_type') || ''); zone = u.get('zone') || '' } catch (_) {} }
    if (!ti && zone) { tt = 'zone'; ti = zone } // back-compat: ?zone=<id>
    if (!tt) tt = 'zone'
    const limit = q.limit || ''
    if (!ti) return e.json(400, { message: 'target required' })
    return e.json(200, go.buildComments($app, String(tt), String(ti), limit))
  } catch (err) { return badOr500(e, err) }
})

routerAdd('POST', '/api/go/profile/intro', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.saveIntro($app, body))
  } catch (err) { return badOr500(e, err) }
})

routerAdd('GET', '/api/go/profile/intro', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    let account = (info && info.query && info.query.account) || ''
    if (!account) { try { account = e.request.url.query().get('account') || '' } catch (_) {} }
    return e.json(200, go.socialProfile($app, String(account)) || { nickname: '', avatarId: '', bio: '', homeZone: '', homeZoneName: '' })
  } catch (err) { return badOr500(e, err) }
})
