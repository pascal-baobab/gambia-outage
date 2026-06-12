/// <reference path="../pb_data/types.d.ts" />
// go_mod.pb.js — in-app moderation route. A pseudonym with profiles.is_moderator=true (e.g. ATPC /
// VALDA, flipped by the owner in /_/) can HARD-delete ANY user content directly from the app — no
// PocketBase superuser token, no Cloudflare Access. Authorisation is the caller's account_id
// capability (verified server-side in go.modDelete), NOT the nickname. Irreversible + cascade +
// per-account hourly cap + mod_log audit. Generic {message} errors; bad input → 400, transient → 500.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE the handler; use global $app.

// POST /api/go/mod/delete { account_id, type, id } — type ∈ comment|question|post|community_link|social_link
routerAdd('POST', '/api/go/mod/delete', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.modDelete($app, body))
  } catch (err) {
    const msg = String(err)
    const code = err instanceof BadRequestError ? 400 : 500
    if (code === 500) $app.logger().error('mod delete failed', 'err', msg)
    return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
  }
})
