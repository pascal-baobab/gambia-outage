// push.ts — anonymous Web Push subscribe/unsubscribe client. Lazy-imported (never blocks
// first paint). Talks to GET /api/go/vapid, POST/DELETE /api/go/subscribe. iOS note: push
// only works in a Home-Screen-installed PWA on iOS 16.4+, and permission must be requested
// from a real user gesture (the caller invokes subscribeToZone from a tap).

const GO = '/api/go'
const VAPID_CACHE_KEY = 'go_vapid'
const VAPID_TTL_MS = 24 * 3600 * 1000

function urlB64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// VAPID key cached in-module + localStorage (24h): subscribeToZone must spend the tap's transient
// user activation on Notification.requestPermission(), not on a network fetch — on iOS a slow
// fetch BEFORE the permission ask let the activation expire and the prompt throw (NotAllowedError).
let vapidMem: string | null = null
async function getVapidKey(): Promise<string | null> {
  if (vapidMem) return vapidMem
  try {
    const c = JSON.parse(localStorage.getItem(VAPID_CACHE_KEY) || 'null') as { key?: string; ts?: number } | null
    if (c?.key && c.ts && Date.now() - c.ts < VAPID_TTL_MS) { vapidMem = c.key; return c.key }
  } catch { /* corrupt cache → refetch */ }
  try {
    const res = await fetch(`${GO}/vapid`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as { publicKey?: string; enabled?: boolean }
    if (data.enabled && data.publicKey) {
      vapidMem = data.publicKey
      try { localStorage.setItem(VAPID_CACHE_KEY, JSON.stringify({ key: data.publicKey, ts: Date.now() })) } catch { /* */ }
      return data.publicKey
    }
    return null
  } catch {
    return null
  }
}

export type SubscribeResult = 'subscribed' | 'denied' | 'unsupported' | 'unavailable' | 'failed'
export type AlertKind = 'out' | 'back'

/** True if this device CAN actually receive Web Push right now. On iOS/iPadOS that requires the PWA
 *  to be installed to the Home Screen (standalone) on 16.4+ — a normal Safari tab can subscribe to
 *  nothing. The caller uses this to show the "add to Home Screen first" flow instead of a dead ask. */
export function canReceivePush(): boolean {
  if (!pushSupported()) return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
  if (!isIOS) return true
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return !!standalone
}

/** Request permission (if needed) and subscribe this device to alerts for a zone. `kinds` selects
 *  which alerts ('out' / 'back'); defaults to both.
 *  ORDER MATTERS (iOS): the permission ask comes FIRST, while the calling tap's transient user
 *  activation is still fresh — any network await before it (the old VAPID fetch) could expire the
 *  activation on slow connections and make requestPermission throw/deny. The VAPID key is fetched
 *  after (and is usually a localStorage cache hit anyway). */
export async function subscribeToZone(zoneId: string, kinds: AlertKind[] = ['out', 'back']): Promise<SubscribeResult> {
  if (!pushSupported()) return 'unsupported'
  try {
    if (Notification.permission === 'denied') return 'denied'
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return 'denied'
    }

    const vapid = await getVapidKey()
    if (!vapid) return 'unavailable' // server has no VAPID configured yet

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid),
      })
    }
    return await postSubscription(zoneId, kinds, sub)
  } catch {
    return 'failed' // includes an expired-activation NotAllowedError from requestPermission
  }
}

/** POST one (zone, subscription) pair to the server. Shared by subscribe + the silent heartbeat. */
async function postSubscription(zoneId: string, kinds: AlertKind[], sub: PushSubscription): Promise<SubscribeResult> {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  // Mint a best-effort Turnstile token (hidden widget; no-op/null when disabled). The subscribe
  // endpoint gates on Turnstile when a secret is set — this keeps real, gesture-driven subscribes
  // working without a visible widget. null is fine when Turnstile is off (the common case today).
  const { getTurnstileToken } = await import('@/lib/turnstile')
  const cf_turnstile_token = (await getTurnstileToken()) || undefined
  const res = await fetch(`${GO}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone: zoneId, kinds, subscription: { endpoint: json.endpoint, keys: json.keys }, cf_turnstile_token }),
  })
  return res.ok ? 'subscribed' : 'failed'
}

/** Silent re-subscribe for zones the user already has bells on (called once per app session).
 *  Never prompts: runs only with permission already granted AND an existing browser subscription.
 *  Each POST is an idempotent upsert that refreshes the row's `updated` — the server evicts
 *  stalest-first past SUB_MAX, so this heartbeat is what keeps active devices' bells alive. */
export async function refreshPushSubscriptions(zoneIds: string[]): Promise<void> {
  if (!pushSupported() || zoneIds.length === 0) return
  try {
    if (Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    for (const z of zoneIds) {
      try { await postSubscription(z, ['out', 'back'], sub) } catch { /* best-effort per zone */ }
    }
  } catch { /* heartbeat must never surface errors */ }
}

/** Remove ONLY this zone's bell on the server — the device's browser subscription (and its other
 *  zones' bells) stay intact. Use `unsubscribe()` when no bells remain. */
export async function unsubscribeZone(zoneId: string): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    await fetch(`${GO}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, zone: zoneId }),
    })
    return true
  } catch {
    return false
  }
}

/** Remove this device's push subscription entirely (best-effort, both client + server). */
export async function unsubscribe(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await fetch(`${GO}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    return true
  } catch {
    return false
  }
}
