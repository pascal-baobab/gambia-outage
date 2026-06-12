// index.js — Web Push sidecar (VAPID). Polls the push_queue collection every ~10s, sends a
// "power is back" notification to every subscription for the zone, and deletes the queue row.
// PB's JSVM can't run web-push, so the close-hook (push.pb.js) only enqueues; this sends.
//
// Crash-safe by design: unsent queue rows survive a restart. Prunes dead endpoints (404/410).
// Anonymous: a subscription is only an opaque endpoint + keys + zone — no PII.
import 'dotenv/config'
import webpush from 'web-push'
import PocketBase from 'pocketbase'

const {
  VAPID_PUBLIC,
  VAPID_PRIVATE,
  VAPID_SUBJECT = 'mailto:ops@gambiaoutage.com',
  PB_URL = 'http://127.0.0.1:8090',
  PB_ADMIN_EMAIL,
  PB_ADMIN_PASSWORD,
} = process.env

const POLL_MS = Number(process.env.PUSH_POLL_MS || 10_000)
// Give up on a queue row after this many ticks of transient (429/5xx) failure, so a
// permanently-broken zone can't pin a row in the queue forever.
const MAX_ATTEMPTS = Number(process.env.PUSH_MAX_ATTEMPTS || 5)

async function main() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('[push-worker] VAPID keys not set — idle. Set VAPID_PUBLIC/PRIVATE in /root/.env.')
    return
  }
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.log('[push-worker] PB admin creds not set — idle. Set PB_ADMIN_EMAIL/PASSWORD.')
    return
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const pb = new PocketBase(PB_URL)
  pb.autoCancellation(false)

  async function ensureAuth() {
    if (pb.authStore.isValid) return
    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
  }

  async function sendToZone(zoneId, zoneName, kind = 'back') {
    // Hierarchy fan-out (2026-06-12): subscriptions are zone-exact but events land wherever the
    // report snapped (GPS → quarter; area picks can be region-level). A quarter event must also
    // reach the parent region's subscribers, and a region event its quarters' — otherwise whole
    // groups of bells silently never ring. Family = the event's zone + parent (if settlement) +
    // children (if region).
    const family = [zoneId]
    try {
      const z = await pb.collection('zones').getOne(zoneId)
      if (z.level === 'settlement' && z.parent) family.push(z.parent)
      else if (z.level === 'region') {
        const kids = await pb.collection('zones').getFullList({ filter: `parent = "${zoneId}"`, fields: 'id' })
        family.push(...kids.map((k) => k.id))
      }
    } catch (_) { /* zone lookup is best-effort — fall back to exact-zone delivery */ }
    const filter = family.map((id) => `zone = "${id}"`).join(' || ')
    let subs = await pb.collection('subscriptions').getFullList({ filter })
    // Multi-zone devices (endpoint subscribed to both a quarter and its region) get ONE
    // notification; the exact-zone row wins the dedupe so its `kinds` preference applies.
    subs.sort((a, b) => (a.zone === zoneId ? 0 : 1) - (b.zone === zoneId ? 0 : 1))
    const seen = new Set()
    subs = subs.filter((s) => !seen.has(s.endpoint) && seen.add(s.endpoint))
    // Deliver only to devices that opted into THIS alert kind. `kinds` is a json array; legacy rows
    // without it default to ['back'] (the original behaviour).
    subs = subs.filter((s) => {
      const ks = Array.isArray(s.kinds) && s.kinds.length ? s.kinds : ['back']
      return ks.includes(kind)
    })
    if (!subs.length) return { total: 0, sent: 0, pruned: 0, failed: 0 }
    const where = zoneName || 'your area'
    const payload = JSON.stringify(
      kind === 'out'
        ? { title: 'Power out', body: `${where}: neighbours are reporting an outage.`, url: `/zone/${zoneId}`, tag: `out-${zoneId}` }
        : { title: 'Power is back', body: `${where}: neighbours report electricity has returned.`, url: `/zone/${zoneId}`, tag: `back-${zoneId}` },
    )
    let sent = 0
    let pruned = 0
    let failed = 0 // transient (429/5xx) failures — these warrant a retry
    for (const s of subs) {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
      } catch (err) {
        const code = err && err.statusCode
        if (code === 404 || code === 410) {
          // endpoint gone for good → prune (not a transient failure)
          try { await pb.collection('subscriptions').delete(s.id); pruned++ } catch (_) {}
        } else {
          // 429/5xx/network → leave the subscription AND keep the queue row for a retry
          failed++
        }
      }
    }
    return { total: subs.length, sent, pruned, failed }
  }

  async function tick() {
    try {
      await ensureAuth()
      const rows = await pb.collection('push_queue').getList(1, 25, { sort: 'created' })
      for (const row of rows.items) {
        const { total, sent, pruned, failed } = await sendToZone(row.zone, row.zone_name, row.kind || 'back')
        // Delete the queue row ONLY when there is nothing left to retry: either nobody to deliver
        // to, or every send either succeeded or was pruned as gone. A transient failure keeps the
        // row (incrementing attempts) so a later tick retries — UNLESS we've burned MAX_ATTEMPTS.
        const attempts = (row.attempts || 0) + 1
        const settled = total === 0 || failed === 0
        if (settled) {
          try { await pb.collection('push_queue').delete(row.id) } catch (_) {}
        } else if (attempts >= MAX_ATTEMPTS) {
          console.error(`[push-worker] zone=${row.zone} giving up after ${attempts} attempts (failed=${failed})`)
          try { await pb.collection('push_queue').delete(row.id) } catch (_) {}
        } else {
          try { await pb.collection('push_queue').update(row.id, { attempts }) } catch (_) {}
          console.log(`[push-worker] zone=${row.zone} retry ${attempts}/${MAX_ATTEMPTS} (sent=${sent} failed=${failed})`)
        }
        if (sent || pruned) console.log(`[push-worker] zone=${row.zone} sent=${sent} pruned=${pruned}`)
      }
    } catch (err) {
      console.error('[push-worker] tick error:', err && err.message ? err.message : String(err))
      try { pb.authStore.clear() } catch (_) {}
    }
  }

  console.log(`[push-worker] running against ${PB_URL}, polling every ${POLL_MS}ms.`)
  // Graceful shutdown: finish the in-flight tick, then exit cleanly so systemd doesn't SIGKILL
  // us mid-poll (which could leave a row half-processed). Unsent rows survive regardless.
  let stopping = false
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      if (stopping) process.exit(0) // second signal → force quit
      stopping = true
      console.log(`[push-worker] ${sig} received — finishing current tick then exiting.`)
    })
  }
  while (!stopping) {
    await tick()
    if (stopping) break
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
  console.log('[push-worker] stopped.')
  process.exit(0)
}

main().catch((e) => {
  console.error('[push-worker] fatal:', e)
  process.exit(1)
})
