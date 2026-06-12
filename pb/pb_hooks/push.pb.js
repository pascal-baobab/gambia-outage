/// <reference path="../pb_data/types.d.ts" />
// push.pb.js — Web Push (Phase 3): VAPID public key route, anonymous subscribe/unsubscribe,
// and the event-close → push_queue enqueue hook. Delivery itself happens in the Node sidecar
// (pb/push-worker) which polls push_queue — PB's JSVM can't run web-push.
//
// ⚠ JSVM gotcha: handlers are isolated → require(lib/go.js) INSIDE each, use global $app.
// Anonymity: a subscription is only an opaque endpoint + keys + zone. Never store rl_key/PII.

// GET /api/go/vapid — public VAPID key for PushManager.subscribe (no secret here).
routerAdd('GET', '/api/go/vapid', (e) => {
  const pub = $os.getenv('VAPID_PUBLIC') || ''
  return e.json(200, { publicKey: pub, enabled: pub !== '' })
})

// POST /api/go/subscribe — body { zone, subscription:{ endpoint, keys:{ p256dh, auth } } }
// Anti-abuse: this endpoint is unauthenticated by design (anonymous push). We must NOT store an
// rl_key on the subscription — that would re-link a device's push to its reports and undo the P0
// anonymity hardening. So instead we gate flooding with the SAME Turnstile challenge as the report
// POST (no-op until TURNSTILE_SECRET is set), validate the endpoint is a real https push URL, and
// cap the body — a bot can't cheaply forge thousands of distinct endpoints to FIFO-evict real subs.
routerAdd('POST', '/api/go/subscribe', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const body = (info && info.body) || {}
    const zoneId = body.zone
    const sub = body.subscription || {}
    const endpoint = (sub.endpoint || '').toString()
    const keys = sub.keys || {}
    if (!zoneId || !endpoint) throw new BadRequestError('zone and subscription.endpoint are required')
    // endpoint must be a plausible Web Push URL — reject garbage / non-https floods early.
    if (!/^https:\/\/[^\s]{8,2048}$/.test(endpoint)) throw new BadRequestError('invalid subscription.endpoint')
    // anti-bot: same Turnstile gate as the report POST (fails closed only when a secret is set).
    let realIP = ''
    try { realIP = e.realIP() || '' } catch (_) {}
    const tsToken = (body.cf_turnstile_token || '').toString()
    if (!go.verifyTurnstile($app, tsToken, realIP)) throw new BadRequestError('challenge failed — please try again')
    // anti-flood (2026-06-12): per-IP hourly cap. With Turnstile off this endpoint was a free
    // eviction attack — forged endpoints could push real subscribers past the SUB_MAX cap.
    if (!go.subRlCheck($app, realIP ? go.ipKey($app, realIP) : '')) {
      return e.json(429, { message: 'too many subscription changes from this network — try again later' })
    }
    // zone must exist
    try { $app.findRecordById('zones', zoneId) } catch (_) { throw new BadRequestError('unknown zone') }
    // which alerts this device wants for this zone: ['out','back'] | ['back'] | ['out'] (default back).
    const kinds = Array.isArray(body.kinds) ? body.kinds : undefined
    const id = go.subscribePush($app, zoneId, endpoint, keys.p256dh, keys.auth, kinds)
    return e.json(200, { ok: true, id })
  } catch (err) {
    if (err instanceof BadRequestError) throw err
    $app.logger().error('subscribe failed', 'err', String(err))
    return e.json(500, { message: 'subscribe failed' })
  }
})

// DELETE /api/go/subscribe — body { endpoint, zone? }. With `zone`: remove only that bell (the
// device keeps its other zones — multi-zone since 2026-06-12). Without: full opt-out.
routerAdd('DELETE', '/api/go/subscribe', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const body = (e.requestInfo().body) || {}
    const endpoint = body.endpoint
    if (!endpoint) throw new BadRequestError('endpoint is required')
    const removed = go.unsubscribePush($app, endpoint, (body.zone || '').toString() || undefined)
    return e.json(200, { ok: removed })
  } catch (err) {
    if (err instanceof BadRequestError) throw err
    $app.logger().error('unsubscribe failed', 'err', String(err))
    return e.json(500, { message: 'unsubscribe failed' })
  }
})

// events: on update → if it just transitioned to status='closed' via community confirm, enqueue
// a 'back' push. Skip auto-closes (auto_closed=true) — idle timeout ≠ confirmed power restore.
// PB v0.39: onRecordAfterUpdateSuccess + e.record.original() for the pre-update snapshot.
onRecordAfterUpdateSuccess((e) => {
  try {
    const rec = e.record
    if (rec.get('status') === 'closed') {
      let was = ''
      try { was = rec.original().get('status') } catch (_) {}
      if (was !== 'closed' && !rec.get('auto_closed')) {
        const go = require(`${__hooks}/lib/go.js`)
        go.enqueueBackPush(e.app, rec)
      }
    }
  } catch (_) {
    // never let push enqueue break the event update
  }
  e.next()
}, 'events')

// events: on create → a new OPEN event means a fresh outage; enqueue a 'out' push (once per event,
// the push_queue (event,kind) unique index dedupes). Subscribers who opted into 'out' get notified.
onRecordAfterCreateSuccess((e) => {
  try {
    if (e.record.get('status') === 'open') {
      const go = require(`${__hooks}/lib/go.js`)
      go.enqueueOutPush(e.app, e.record)
    }
  } catch (_) {
    // never let push enqueue break the event create
  }
  e.next()
}, 'events')
