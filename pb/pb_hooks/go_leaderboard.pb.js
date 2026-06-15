/// <reference path="../pb_data/types.d.ts" />
// go_leaderboard.pb.js — per-zone Photo-Crush leaderboard routes (Phase 6). Submit a best-per-week
// score and read the current-week ranked board. Persistent-pseudonym layer (account_id + nickname +
// avatar); NEVER linked to the anonymous reports. Anti-cheat is RESPONSE not prevention (the score is
// client-authoritative): a generous server plausibility cap + per-IP lb_rl rate limit + best-per-week
// dedupe + moderator hard-delete, all in lib/go.js. Generic {message} errors; bad input → 400.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE each handler; use global $app.
// The POST inherits go_guard.pb.js's 16KB body cap; the GET inherits the /api/go/* ~10s edge cache.

function badOr500(e, err) {
  const code = err instanceof BadRequestError ? 400 : 500
  if (code === 500) $app.logger().error('leaderboard route failed', 'err', String(err))
  return e.json(code, { message: code === 400 ? String(err.message || 'bad request') : 'internal error' })
}

// POST /api/go/leaderboard/submit { account_id, nickname, avatar_id, zone, score }
// realIP feeds the lb_rl per-IP ledger (it is consumed by lbRlCheck then discarded — never on the row).
routerAdd('POST', '/api/go/leaderboard/submit', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let realIP = 'dev-local'; try { realIP = e.realIP() || realIP } catch (_) {}
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    return e.json(200, go.submitScore($app, body, realIP))
  } catch (err) { return badOr500(e, err) }
})

// GET /api/go/leaderboard?zone=&week=&limit=  — empty/missing/"all" zone ⇒ All-zones board.
routerAdd('GET', '/api/go/leaderboard', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const q = (info && info.query) || {}
    let zone = q.zone || ''
    let week = q.week || ''
    let limit = q.limit || ''
    if (!zone && !week) {
      try { const u = e.request.url.query(); zone = u.get('zone') || ''; week = u.get('week') || ''; limit = limit || (u.get('limit') || '') } catch (_) {}
    }
    return e.json(200, go.buildLeaderboard($app, String(zone || ''), String(week || ''), limit))
  } catch (err) { return badOr500(e, err) }
})
