// outbox.ts — offline report queue (IndexedDB, zero deps). App-thread outbox: when a report
// can't be sent (offline / network error), it's queued here and flushed on `online` + on app
// start. Every queued report carries a client_uuid, and the backend dedupes on it
// (reports_create.pb.js step 4 → 400 "duplicate client_uuid"), so replay is idempotent and
// double-send is safe.
//
// Scope note: this covers iOS/Firefox/Android uniformly (no Background Sync dependency). The
// one thing it does NOT do is replay while the app/tab is fully closed (that needs a Workbox
// BackgroundSyncPlugin in a custom SW — Chromium-only — deferred; see docs/research/
// phase3-offline-outbox.md). Flush happens whenever the app is open + comes online.

import type { ReportInput } from '@/lib/api'

const DB_NAME = 'go-outbox'
const STORE = 'reports'
const DB_VERSION = 1

export interface OutboxItem {
  client_uuid: string // primary key (also the backend dedupe key)
  input: ReportInput
  queuedAt: number
  place: string // human label for optional pending UI
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'client_uuid' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

export async function enqueue(item: OutboxItem): Promise<void> {
  await tx('readwrite', (s) => s.put(item))
  notify()
}

export async function listOutbox(): Promise<OutboxItem[]> {
  try {
    return (await tx<OutboxItem[]>('readonly', (s) => s.getAll() as IDBRequest<OutboxItem[]>)) ?? []
  } catch {
    return []
  }
}

export async function remove(clientUuid: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(clientUuid))
  notify()
}

export async function outboxCount(): Promise<number> {
  try {
    return await tx<number>('readonly', (s) => s.count())
  } catch {
    return 0
  }
}

// tiny pub/sub so a pending badge can react to queue changes
type Listener = () => void
const listeners = new Set<Listener>()
export function onOutboxChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function notify() {
  listeners.forEach((l) => {
    try { l() } catch { /* ignore */ }
  })
}

let flushing = false

/**
 * Try to send every queued report. Removes items that succeed OR that the backend has already
 * applied (duplicate client_uuid → benign). Leaves genuinely-unreachable items for the next
 * flush. `send` is injected to avoid a circular import with api.ts.
 *
 * `onItemDelivered` is an optional callback fired once per successfully delivered item (after
 * remove(), before sent++). The callback receives the full OutboxItem so callers can surface
 * a per-item notification using the human `place` label — see useOutboxFlush.ts for usage.
 * This callback approach keeps outbox.ts free of any app/ layer imports (Pitfall 1).
 */
export async function flushOutbox(
  send: (input: ReportInput) => Promise<void>,
  isDuplicate: (err: unknown) => boolean,
  onItemDelivered?: (item: OutboxItem) => void,
): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: await outboxCount() }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: await outboxCount() }
  }
  flushing = true
  let sent = 0
  try {
    const items = await listOutbox()
    for (const item of items) {
      try {
        await send(item.input)
        await remove(item.client_uuid)
        onItemDelivered?.(item)
        sent++
      } catch (err) {
        if (isDuplicate(err)) {
          // already applied server-side (a prior partial send) → drop it, it's done
          await remove(item.client_uuid)
          onItemDelivered?.(item)
          sent++
        } else {
          // network still down (or transient) → stop; retry on next online/flush
          break
        }
      }
    }
  } finally {
    flushing = false
  }
  return { sent, remaining: await outboxCount() }
}
