// realtime.ts — minimal PocketBase SSE realtime client (events collection only).
//
// Hand-rolled, zero-dep: the official `pocketbase` SDK is ~25 KB gz and pulls a
// service layer we don't use. We subscribe to one (public) collection, so a raw
// EventSource is the leaner choice for 2G / low-end Android.
//
// Protocol (PB v0.39, stable since ~0.22):
//   1. GET /api/realtime → server emits a `PB_CONNECT` event whose data carries a
//      `clientId`. Until we POST our subscription list keyed by that clientId we
//      are subscribed to nothing.
//   2. POST /api/realtime { clientId, subscriptions } → 204. This REPLACES the
//      full set, so it must be re-sent after every (re)connect (a new GET ⇒ new
//      clientId ⇒ subscriptions reset).
//   3. Each change arrives as an SSE message whose `event:` field is the exact
//      topic string we subscribed with (e.g. `events/*`) and whose `data` is
//      `{ action, record }`.
//
// Same-origin (rides the Cloudflare Tunnel like api.ts). Public reads → no auth
// header. One shared connection, reconnect with exponential backoff + jitter,
// paused while the tab is hidden (2G battery/data).

type RtAction = 'create' | 'update' | 'delete'
export interface RtEvent {
  action: RtAction
  record: Record<string, unknown>
}
type Handler = (e: RtEvent) => void

// Whole-collection selector is the literal `*` (a bare `events` is NOT valid).
const TOPICS = ['events/*'] as const
const REALTIME_URL = '/api/realtime'

const BACKOFF_MIN = 1000
const BACKOFF_MAX = 30_000

let es: EventSource | null = null
let clientId = ''
let backoff = BACKOFF_MIN
let stopped = true
let retryTimer: ReturnType<typeof setTimeout> | null = null
const handlers = new Set<Handler>()

/** Subscribe to realtime events. Returns an unsubscribe fn. */
export function onRealtime(h: Handler): () => void {
  handlers.add(h)
  return () => {
    handlers.delete(h)
  }
}

async function postSubscriptions(): Promise<void> {
  if (!clientId) return
  // Replaces the full set; must be re-sent on every (re)connect.
  await fetch(REALTIME_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, subscriptions: TOPICS }),
    keepalive: true,
  }).catch(() => {
    /* will retry on the next reconnect */
  })
}

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

function teardown(): void {
  if (es) {
    es.close()
    es = null
  }
  clientId = ''
}

function connect(): void {
  if (stopped || es || typeof EventSource === 'undefined') return
  es = new EventSource(REALTIME_URL) // GET, Accept: text/event-stream

  es.addEventListener('PB_CONNECT', (ev) => {
    try {
      clientId = JSON.parse((ev as MessageEvent).data).clientId
      backoff = BACKOFF_MIN // healthy connection → reset backoff
      void postSubscriptions()
    } catch {
      /* ignore malformed PB_CONNECT */
    }
  })

  // One listener per topic — SSE dispatches by the `event:` field, which equals
  // the topic string we subscribed with.
  for (const topic of TOPICS) {
    es.addEventListener(topic, (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as RtEvent
        handlers.forEach((h) => h(data))
      } catch {
        /* ignore malformed payloads */
      }
    })
  }

  es.onerror = () => {
    // Native EventSource auto-reconnects, but PB issues a new clientId on each
    // GET and resets subscriptions — so a bare auto-retry leaves us connected
    // but deaf. Tear down fully and reconnect with our own backoff so we always
    // re-POST the subscription list after the next PB_CONNECT.
    teardown()
    if (stopped) return
    backoff = Math.min(backoff * 2, BACKOFF_MAX)
    clearRetry()
    retryTimer = setTimeout(connect, backoff + Math.random() * 500) // jitter
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'hidden') {
    // Pause: kill the socket so the 2G radio can sleep (no battery/data drain
    // from keep-alive bytes). Cancel any pending reconnect too.
    clearRetry()
    teardown()
  } else if (!stopped && !es) {
    backoff = BACKOFF_MIN
    connect() // resume; cache freshness on resume handled by refetchOnWindowFocus
  }
}

/** Open the realtime connection (idempotent). Gate behind data-saver upstream. */
export function startRealtime(): void {
  if (!stopped) return
  stopped = false
  backoff = BACKOFF_MIN
  document.addEventListener('visibilitychange', onVisibility)
  // Only connect immediately if the tab is visible.
  if (document.visibilityState !== 'hidden') connect()
}

/** Close the connection and detach listeners (idempotent). */
export function stopRealtime(): void {
  if (stopped) return
  stopped = true
  clearRetry()
  teardown()
  document.removeEventListener('visibilitychange', onVisibility)
}
