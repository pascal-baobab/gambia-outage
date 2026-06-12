/// <reference path="../pb_data/types.d.ts" />
// go_admin.pb.js — owner ops dashboard API for /admin. Every route is gated by
// $apis.requireSuperuserAuth() so the DATA is protected by a valid PocketBase superuser token
// (the page itself also sits behind Cloudflare Access — defence in depth). The loopback worker
// never hits these. Read-only aggregates; numbers reuse lib/go.js so they match the public site.
//
// ⚠ PB JSVM gotcha: handlers run in an ISOLATED runtime → require(lib/go.js) INSIDE the handler,
// and use the global $app (the route event's e.app lacks these data methods).

// GET /api/go/admin/overview — curated operational snapshot (national, events, volume, push, system).
routerAdd('GET', '/api/go/admin/overview', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, go.buildAdminOverview($app))
  } catch (err) {
    $app.logger().error('admin overview failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// GET /api/go/admin/reports — recent raw reports for the debug panel (coarsened GPS at rest;
// rl_key truncated to 8 chars). Superuser-only.
routerAdd('GET', '/api/go/admin/reports', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, { reports: go.recentReports($app, 80) })
  } catch (err) {
    $app.logger().error('admin reports failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// POST /api/go/admin/community-links/hide {id, hidden?} — owner moderation of user-submitted links.
// Default hides; pass {hidden:false} to restore. Superuser-only.
routerAdd('POST', '/api/go/admin/community-links/hide', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo().body) || {}
    const id = (body.id || '').toString()
    if (!id) return e.json(400, { message: 'id required' })
    const hidden = body.hidden === false ? false : true
    return e.json(200, go.setCommunityLinkHidden($app, id, hidden))
  } catch (err) {
    const msg = String(err)
    if (msg.indexOf('not found') >= 0) return e.json(404, { message: 'not found' })
    $app.logger().error('admin clink hide failed', 'err', msg)
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// POST /api/go/admin/content/hide {type, id, hidden?} — generic owner moderation of ANY user content
// (type ∈ comment|question|post|community_link|social_link). Default hides; {hidden:false} restores.
// Powers the in-app long-press delete (the public app authenticates with the superuser token). Superuser-only.
routerAdd('POST', '/api/go/admin/content/hide', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo().body) || {}
    const type = (body.type || '').toString()
    const id = (body.id || '').toString()
    if (!type || !id) return e.json(400, { message: 'type and id required' })
    const hidden = body.hidden === false ? false : true
    return e.json(200, go.setContentHidden($app, type, id, hidden))
  } catch (err) {
    const msg = String(err)
    if (msg.indexOf('not found') >= 0) return e.json(404, { message: 'not found' })
    if (msg.indexOf('bad type') >= 0) return e.json(400, { message: 'bad type' })
    $app.logger().error('admin content hide failed', 'err', msg)
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())
