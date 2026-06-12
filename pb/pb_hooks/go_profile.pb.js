/// <reference path="../pb_data/types.d.ts" />
// go_profile.pb.js — anonymous gamification API.
//   POST /api/go/xp/claim  { account_id, claim_nonce }  → redeem an unclaimed grant into the ledger
//   GET  /api/go/profile?account=<id>                    → that account's xp/rank/badges/streak
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE each handler; use global $app.
routerAdd('POST', '/api/go/xp/claim', (e) => {
  const info = e.requestInfo()
  const body = (info && info.body) || {}
  const account = String(body.account_id || '')
  const nonce = String(body.claim_nonce || '')
  // bad input → 400 (deterministic: client drops the nonce)
  if (!/^[a-f0-9]{64}$/.test(account) || nonce.length < 16 || nonce.length > 128) {
    return e.json(400, { message: 'bad request' })
  }
  try {
    const go = require(`${__hooks}/lib/go.js`)
    go.claimGrant($app, account, nonce)
    return e.json(200, go.buildProfile($app, account))
  } catch (err) {
    // unexpected / transient (DB hiccup etc.) → 500 (client retries, keeps the nonce queued)
    $app.logger().error('xp claim failed', 'err', String(err))
    return e.json(500, { message: 'claim failed' })
  }
})

routerAdd('GET', '/api/go/profile', (e) => {
  // PB JSVM: requestInfo().query is the repo-standard accessor; fall back to url.query() defensively.
  const info = e.requestInfo()
  let account = (info && info.query && info.query.account) || ''
  if (!account) { try { account = e.request.url.query().get('account') || '' } catch (_) {} }
  if (!/^[a-f0-9]{64}$/.test(String(account))) return e.json(400, { message: 'bad request' })
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, go.buildProfile($app, account))
  } catch (err) {
    $app.logger().error('xp profile failed', 'err', String(err))
    return e.json(500, { message: 'profile failed' })
  }
})

routerAdd('GET', '/api/go/stats', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    return e.json(200, go.buildStats($app))
  } catch (err) {
    $app.logger().error('xp stats failed', 'err', String(err))
    return e.json(400, { message: 'stats failed' })
  }
})
