// notifStore.test.ts — RED scaffold for the notification store.
//
// notifStore.ts is NOT written in this plan (Plan 01) — these tests are
// intentionally failing so Plan 02 can turn them GREEN by implementing
// the store.
//
// Modelled after web/src/app/radioStore.test.ts:
//   - Vitest imports; localStorage mock via beforeEach / afterEach.
//   - Each test seeds localStorage directly (no jsdom needed, store reads it
//     on hydration) or drives the store via its public API.
//
// Contract asserted (from 03-UI-SPEC.md "Notification Store Contract"):
//   CAP        = 50   — adding 51 items drops the oldest (newest-first)
//   SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000   — items older than this are
//                                                 purged at rehydration
//   useNotifStore — Zustand persist store, key 'go_notif'
//   shouldFirePulse — pure helper exported from notifStore.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// These imports WILL fail until Plan 02 lands notifStore.ts — RED is the
// intended state.
import { useNotifStore, shouldFirePulse, CAP, SEVEN_DAYS_MS } from './notifStore'

// ---------------------------------------------------------------------------
// localStorage mock — same technique as radioStore.test.ts
// ---------------------------------------------------------------------------
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
  length: 0,
  key: () => null,
}

beforeEach(() => {
  // Wipe storage and reset to empty store state before every test.
  localStorageMock.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  // Reset store to baseline — items empty, lastSeenTs 0.
  useNotifStore.setState({ items: [], lastSeenTs: 0 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helper: create a minimal NotifItem payload (type only — store fills id/ts/seen)
// Defined for future tests; consumed once here to satisfy noUnusedLocals.
// ---------------------------------------------------------------------------
function makePayload(type: 'xp_rankup' | 'outbox_delivered' | 'push_alert' | 'today_pulse' | 'message' = 'push_alert') {
  return { type, payload: { title: 'Test', body: 'Body' } } as const
}
// Satisfy noUnusedLocals without removing the helper (future tests may use it).
void makePayload

describe('notifStore', () => {

  // -------------------------------------------------------------------------
  // NOTIF-02 — CAP: overflow drops the oldest item (store is newest-first)
  // -------------------------------------------------------------------------
  it('cap: adding 51 items keeps only the 50 most recent (oldest dropped)', () => {
    // Add CAP + 1 items sequentially; the oldest (first added) must be dropped.
    for (let i = 0; i < CAP + 1; i++) {
      useNotifStore.getState().add({ type: 'push_alert', payload: { title: `msg${i}` } })
    }
    const { items } = useNotifStore.getState()
    expect(items.length).toBe(CAP)
    // The oldest item's payload was { title: 'msg0' } — it must be gone.
    const titles = items.map((n) => (n.payload as Record<string, unknown>)?.title)
    expect(titles).not.toContain('msg0')
    // The most recent item's payload was { title: 'msg50' } — it must be present.
    expect(titles).toContain('msg50')
  })

  // -------------------------------------------------------------------------
  // NOTIF-02 — EXPIRY: items older than SEVEN_DAYS_MS are dropped at rehydration
  // -------------------------------------------------------------------------
  it('expiry: stale item (>7 days) is purged; fresh item survives rehydration', () => {
    const NOW = Date.now()
    const STALE_TS = NOW - SEVEN_DAYS_MS - 1000 // 1 s past the boundary → stale
    const FRESH_TS = NOW - SEVEN_DAYS_MS + 60_000 // 1 min before boundary → survives

    // Seed localStorage with one stale and one fresh item so that the store's
    // onRehydrateStorage callback (called on next store creation / read) filters them.
    const staleId = 'stale-item'
    const freshId = 'fresh-item'
    const rawState = {
      state: {
        items: [
          { id: freshId, type: 'push_alert', ts: FRESH_TS, seen: false, payload: {} },
          { id: staleId, type: 'push_alert', ts: STALE_TS, seen: false, payload: {} },
        ],
        lastSeenTs: 0,
      },
      version: 0,
    }
    localStorage.setItem('go_notif', JSON.stringify(rawState))

    // Trigger re-rehydration by calling the store's rehydrate helper.
    // When Plan 02 implements `onRehydrateStorage`, this forces the check.
    useNotifStore.persist.rehydrate()

    const { items } = useNotifStore.getState()
    const ids = items.map((n) => n.id)
    expect(ids).not.toContain(staleId)
    expect(ids).toContain(freshId)
  })

  // -------------------------------------------------------------------------
  // NOTIF-03 — BADGE COUNT: unseenCount reflects items added after lastSeenTs
  // -------------------------------------------------------------------------
  it('badge count: unseenCount = items added after markAllSeen(); markAllSeen drives it to 0', () => {
    // Add two items.
    useNotifStore.getState().add({ type: 'push_alert', payload: {} })
    useNotifStore.getState().add({ type: 'xp_rankup', payload: { newRankKey: 'rep', newRankLabel: 'Reporter' } })

    const { items, lastSeenTs } = useNotifStore.getState()
    const unseenCount = items.filter((n) => n.ts > lastSeenTs).length
    expect(unseenCount).toBe(2)

    // Mark all seen.
    useNotifStore.getState().markAllSeen()
    const afterMark = useNotifStore.getState()
    const unseenAfter = afterMark.items.filter((n) => n.ts > afterMark.lastSeenTs).length
    expect(unseenAfter).toBe(0)
  })

  // -------------------------------------------------------------------------
  // NOTIF-03 — BADGE COUNT: item added AFTER markAllSeen increments badge
  // -------------------------------------------------------------------------
  it('badge count: item added after markAllSeen() shows as unseen', () => {
    // Mark all seen first (nothing to see yet).
    useNotifStore.getState().markAllSeen()

    // Add a new item — ts is now > lastSeenTs.
    useNotifStore.getState().add({ type: 'today_pulse', payload: { zone: 'Banjul', status: 'out' } })

    const { items, lastSeenTs } = useNotifStore.getState()
    const unseenCount = items.filter((n) => n.ts > lastSeenTs).length
    expect(unseenCount).toBe(1)
  })

  // -------------------------------------------------------------------------
  // NOTIF-03 — DISMISS: dismissed item is removed from the list
  // -------------------------------------------------------------------------
  it('dismiss: remove a single notification by id', () => {
    useNotifStore.getState().add({ type: 'push_alert', payload: {} })
    const { items } = useNotifStore.getState()
    expect(items.length).toBe(1)
    const id = items[0].id
    useNotifStore.getState().dismiss(id)
    expect(useNotifStore.getState().items.length).toBe(0)
  })

  // -------------------------------------------------------------------------
  // NOTIF-04 — shouldFirePulse: pure guard helper
  //   (a) same date → false
  //   (b) different date but same status → false
  //   (c) different date + different status → true
  //   (d) first run (lastDate null) → true
  // -------------------------------------------------------------------------
  it('shouldFirePulse: (a) same date → false', () => {
    expect(shouldFirePulse('2026-06-11', 'out', '2026-06-11', 'out')).toBe(false)
  })

  it('shouldFirePulse: (b) different date but same status → false', () => {
    expect(shouldFirePulse('2026-06-10', 'out', '2026-06-11', 'out')).toBe(false)
  })

  it('shouldFirePulse: (c) different date + different status → true', () => {
    expect(shouldFirePulse('2026-06-10', 'out', '2026-06-11', 'on')).toBe(true)
  })

  it('shouldFirePulse: (d) first run (lastDate null) → true', () => {
    expect(shouldFirePulse(null, null, '2026-06-11', 'on')).toBe(true)
  })

  it('shouldFirePulse: null currentStatus (no zone data) → false', () => {
    // If there is no zone status yet, the pulse must not fire (nothing to report).
    expect(shouldFirePulse('2026-06-10', null, '2026-06-11', null)).toBe(false)
  })

})
