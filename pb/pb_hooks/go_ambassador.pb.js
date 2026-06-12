/// <reference path="../pb_data/types.d.ts" />
// go_ambassador.pb.js — Ambassador invite system.
//
//   POST /api/go/ambassador/activate  {token, account_id}  → activate badge (public)
//   POST /api/go/ambassador/invite    {label, max_uses, expires_hours}  → generate link (superuser)
//   GET  /api/go/ambassadors          → public list of ambassadors
//
// ⚠ PB JSVM: handlers run in ISOLATED runtimes — require lib/go.js INSIDE each handler.

// POST /api/go/ambassador/activate — any user calls this with their account_id + the invite token.
// Inserts directly into xp_ledger (no mint/claim round-trip; the token IS the auth). Idempotent.
routerAdd('POST', '/api/go/ambassador/activate', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    const token = String(body.token || '').trim()
    const accountId = String(body.account_id || '').trim()

    if (!/^[a-f0-9]{64}$/.test(accountId)) return e.json(400, { message: 'bad request' })
    if (!token || token.length > 64)       return e.json(400, { message: 'bad request' })

    // Validate invite token
    let invite
    try { invite = $app.findFirstRecordByFilter('ambassador_invites', 'token = {:t}', { t: token }) }
    catch (_) { return e.json(200, { ok: false, error: 'invalid_token' }) }

    const now = new Date()
    const expiresAt = new Date(invite.get('expires_at'))
    if (expiresAt < now) return e.json(200, { ok: false, error: 'expired' })

    const activated = invite.get('activated_count') || 0
    const maxUses   = invite.get('max_uses') || 0
    if (activated >= maxUses) return e.json(200, { ok: false, error: 'exhausted' })

    // Check if profile already has is_ambassador = true
    let prof
    try { prof = $app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: accountId }) }
    catch (_) { prof = null }

    if (prof && prof.get('is_ambassador')) {
      return e.json(200, { ok: true, already: true })
    }

    // Insert xp_ledger row (direct — no mint/claim cycle since token is auth). Nonce prevents double credit.
    const nonceHash = $security.sha256('ambassador:' + accountId)
    const existingLedger = $app.findRecordsByFilter('xp_ledger', 'nonce_hash = {:n}', '', 1, 0, { n: nonceHash })
    if (!existingLedger.length) {
      const weekId = go.isoWeekId(now)
      const ledgerCol = $app.findCollectionByNameOrId('xp_ledger')
      const row = new Record(ledgerCol)
      row.set('account_id', accountId)
      row.set('nonce_hash', nonceHash)
      row.set('xp', 100)
      row.set('kind', 'ambassador')
      row.set('badge', 'first_ambassador')
      row.set('week_id', weekId)
      try { $app.save(row) } catch (_) {} // unique clash = benign race
    }

    // Set is_ambassador + ambassador_since on profiles
    if (!prof) {
      const profCol = $app.findCollectionByNameOrId('profiles')
      prof = new Record(profCol)
      prof.set('account_id', accountId)
    }
    prof.set('is_ambassador', true)
    prof.set('ambassador_since', now.toISOString())
    try { $app.save(prof) } catch (_) {}

    // Increment activated_count
    invite.set('activated_count', activated + 1)
    try { $app.save(invite) } catch (_) {}

    return e.json(200, { ok: true, xp: 100, badge: 'first_ambassador' })
  } catch (err) {
    $app.logger().error('ambassador activate failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// POST /api/go/ambassador/invite — superuser only. Generates a time-limited multi-use invite link.
routerAdd('POST', '/api/go/ambassador/invite', (e) => {
  try {
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    const label       = String(body.label || '').slice(0, 120)
    const maxUses     = Math.max(1, Math.min(1000, parseInt(body.max_uses || '10', 10) || 10))
    const expiresHours = Math.max(1, Math.min(8760, parseInt(body.expires_hours || '168', 10) || 168))

    const token     = $security.randomString(32)
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000)

    const col = $app.findCollectionByNameOrId('ambassador_invites')
    const rec = new Record(col)
    rec.set('token', token)
    rec.set('label', label)
    rec.set('expires_at', expiresAt.toISOString())
    rec.set('max_uses', maxUses)
    rec.set('activated_count', 0)
    $app.save(rec)

    const link = 'https://gambiaoutage.com/#/ambassador/' + token
    return e.json(200, { link, token, expires_at: expiresAt.toISOString() })
  } catch (err) {
    $app.logger().error('ambassador invite failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// POST /api/go/ambassador/request — any user can request ambassador status (unauthenticated).
// Creates or updates a pending request in ambassador_requests. One request per account_id.
routerAdd('POST', '/api/go/ambassador/request', (e) => {
  try {
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    const accountId = String(body.account_id || '').trim()
    const message   = String(body.message || '').slice(0, 500)

    if (!/^[a-f0-9]{64}$/.test(accountId)) return e.json(400, { message: 'bad request' })

    // Check not already ambassador
    let prof
    try { prof = $app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: accountId }) } catch (_) { prof = null }
    if (prof && prof.get('is_ambassador')) return e.json(200, { ok: true, already: true })

    // Upsert request (unique index on account_id)
    let req
    try { req = $app.findFirstRecordByFilter('ambassador_requests', 'account_id = {:a}', { a: accountId }) } catch (_) { req = null }

    if (req) {
      const s = req.get('status')
      if (s === 'approved') return e.json(200, { ok: true, already: true })
      if (s === 'pending')  return e.json(200, { ok: true, already: true })
      // rejected → allow re-request
      req.set('status', 'pending')
      req.set('message', message)
    } else {
      // Pull nickname for admin readability
      let nickname = ''
      try {
        const nameRec = $app.findFirstRecordByFilter('names', 'account_id = {:a}', { a: accountId })
        nickname = nameRec.get('name') || ''
      } catch (_) {}

      const col = $app.findCollectionByNameOrId('ambassador_requests')
      req = new Record(col)
      req.set('account_id', accountId)
      req.set('status', 'pending')
      req.set('message', message)
      req.set('nickname', nickname)
    }

    try { $app.save(req) } catch (_) {}
    return e.json(200, { ok: true })
  } catch (err) {
    $app.logger().error('ambassador request failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// GET /api/go/ambassador/request-status?account_id=… — returns the user's own request status.
routerAdd('GET', '/api/go/ambassador/request-status', (e) => {
  try {
    const accountId = String(e.request.URL.query().get('account_id') || '').trim()
    if (!/^[a-f0-9]{64}$/.test(accountId)) return e.json(200, { status: 'none' })

    let req
    try { req = $app.findFirstRecordByFilter('ambassador_requests', 'account_id = {:a}', { a: accountId }) } catch (_) { req = null }
    if (!req) return e.json(200, { status: 'none' })
    return e.json(200, { status: req.get('status') })
  } catch (err) {
    return e.json(500, { message: 'internal error' })
  }
})

// POST /api/go/admin/ambassador/accept — superuser. Accepts a request and activates the ambassador.
routerAdd('POST', '/api/go/admin/ambassador/accept', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    const requestId = String(body.request_id || '').trim()
    if (!requestId) return e.json(400, { message: 'bad request' })

    const req = $app.findRecordById('ambassador_requests', requestId)
    const accountId = req.get('account_id')

    // Same activation logic as the invite flow
    const nonceHash = $security.sha256('ambassador:' + accountId)
    const existingLedger = $app.findRecordsByFilter('xp_ledger', 'nonce_hash = {:n}', '', 1, 0, { n: nonceHash })
    if (!existingLedger.length) {
      const now = new Date()
      const weekId = go.isoWeekId(now)
      const ledgerCol = $app.findCollectionByNameOrId('xp_ledger')
      const row = new Record(ledgerCol)
      row.set('account_id', accountId)
      row.set('nonce_hash', nonceHash)
      row.set('xp', 100)
      row.set('kind', 'ambassador')
      row.set('badge', 'first_ambassador')
      row.set('week_id', weekId)
      try { $app.save(row) } catch (_) {}
    }

    let prof
    try { prof = $app.findFirstRecordByFilter('profiles', 'account_id = {:a}', { a: accountId }) } catch (_) { prof = null }
    if (!prof) {
      const profCol = $app.findCollectionByNameOrId('profiles')
      prof = new Record(profCol)
      prof.set('account_id', accountId)
    }
    prof.set('is_ambassador', true)
    prof.set('ambassador_since', new Date().toISOString())
    try { $app.save(prof) } catch (_) {}

    req.set('status', 'approved')
    req.set('reviewed_at', new Date().toISOString())
    $app.save(req)

    return e.json(200, { ok: true })
  } catch (err) {
    $app.logger().error('ambassador accept failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// POST /api/go/admin/ambassador/reject — superuser. Rejects a pending ambassador request.
routerAdd('POST', '/api/go/admin/ambassador/reject', (e) => {
  try {
    const body = (e.requestInfo() && e.requestInfo().body) || {}
    const requestId = String(body.request_id || '').trim()
    if (!requestId) return e.json(400, { message: 'bad request' })

    const req = $app.findRecordById('ambassador_requests', requestId)
    req.set('status', 'rejected')
    req.set('reviewed_at', new Date().toISOString())
    $app.save(req)

    return e.json(200, { ok: true })
  } catch (err) {
    $app.logger().error('ambassador reject failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// GET /api/go/admin/ambassador/requests — superuser. Returns all requests sorted newest first.
routerAdd('GET', '/api/go/admin/ambassador/requests', (e) => {
  try {
    let rows = []
    try { rows = $app.findRecordsByFilter('ambassador_requests', '', '-created', 200, 0) } catch (_) {}
    const requests = rows.map((r) => ({
      id:         r.id,
      created:    r.get('created') || '',
      account_id: r.get('account_id') || '',
      nickname:   r.get('nickname') || '',
      message:    r.get('message') || '',
      status:     r.get('status') || 'pending',
    }))
    return e.json(200, { requests })
  } catch (err) {
    $app.logger().error('ambassador requests list failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
}, $apis.requireSuperuserAuth())

// GET /api/go/ambassadors — public list of current ambassadors, ordered by activation date (oldest first).
// Privacy: if discoverable=false, name and avatarId are null.
routerAdd('GET', '/api/go/ambassadors', (e) => {
  try {
    let rows = []
    try { rows = $app.findRecordsByFilter('profiles', 'is_ambassador = true', 'ambassador_since', 200, 0) } catch (_) {}
    const ambassadors = rows.map((r) => ({
      id:              r.id,
      name:            r.get('discoverable') ? (r.get('nickname') || null) : null,
      avatarId:        r.get('discoverable') ? (r.get('avatar_id') || null) : null,
      ambassadorSince: r.get('ambassador_since') || '',
    }))
    return e.json(200, { ambassadors })
  } catch (err) {
    $app.logger().error('ambassadors list failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})
