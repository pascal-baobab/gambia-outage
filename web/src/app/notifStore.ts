// notifStore.ts — localStorage-backed Zustand notification store.
//
// Single flat typed-item array with:
//   - 50-item cap (oldest dropped on overflow)
//   - 7-day expiry at rehydration
//   - lastSeenTs badge cursor (unseenCount = items.filter(n => n.ts > lastSeenTs).length)
//
// Framework-agnostic: no React imports. Importable from outbox.ts / sw-adjacent code.
// Privacy invariant: only display strings are stored — no identifying keys of any kind.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Constants (exported so test scaffold can reference them)
// ---------------------------------------------------------------------------
export const CAP = 50
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotifType =
  | 'xp_rankup'
  | 'outbox_delivered'
  | 'push_alert'
  | 'today_pulse'
  | 'message' // reserved v2.1 — never created in v2.0

// Per-type payload union (D-15): display strings ONLY, zero IDs.
export type NotifPayload =
  | { newRankKey: string; newRankLabel: string }   // xp_rankup
  | { place: string }                               // outbox_delivered
  | { title: string; body: string }                 // push_alert
  | { zone: string; status: string }                // today_pulse
  | Record<string, never>                           // message (reserved no-op)

export interface NotifItem {
  id: string       // crypto.randomUUID()
  type: NotifType
  ts: number       // Date.now()
  seen: boolean    // per-item; badge uses lastSeenTs, not this field
  payload: unknown // narrowed by type at call sites (NotifPayload discriminant)
}

export interface NotifStore {
  items: NotifItem[]
  lastSeenTs: number
  add: (item: Omit<NotifItem, 'id' | 'ts' | 'seen'>) => void
  dismiss: (id: string) => void
  markAllSeen: () => void
}

// ---------------------------------------------------------------------------
// Storage adapter — lazy-resolves globalThis.localStorage on every call.
//
// This allows the store to work in Node test environments where `window` is
// undefined at module-load time but `globalThis.localStorage` is patched by
// the test beforeEach (radioStore.ts uses the same try/catch defensive pattern).
//
// Implements PersistStorage<NotifStore> — the persist middleware passes/receives
// StorageValue<S> objects directly (no extra JSON parsing layer needed here
// since we read/write the raw string and parse/stringify ourselves).
// ---------------------------------------------------------------------------
const lazyStorage: PersistStorage<NotifStore> = {
  getItem(name): StorageValue<NotifStore> | null {
    try {
      const raw = globalThis.localStorage?.getItem(name) ?? null
      if (raw === null) return null
      return JSON.parse(raw) as StorageValue<NotifStore>
    } catch { return null }
  },
  setItem(name, value: StorageValue<NotifStore>): void {
    try {
      globalThis.localStorage?.setItem(name, JSON.stringify(value))
    } catch { /* storage unavailable */ }
  },
  removeItem(name): void {
    try {
      globalThis.localStorage?.removeItem(name)
    } catch { /* storage unavailable */ }
  },
}

// ---------------------------------------------------------------------------
// Rehydration guard: strip stale items and enforce cap at load time (D-02)
// ---------------------------------------------------------------------------
const onRehydrateStorage = () => (state: NotifStore | undefined) => {
  if (!state) return
  const cutoff = Date.now() - SEVEN_DAYS_MS
  state.items = state.items.filter((n) => n.ts > cutoff).slice(0, CAP)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useNotifStore = create<NotifStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastSeenTs: 0,

      add(item) {
        set((s) => ({
          items: [
            {
              id: crypto.randomUUID(),
              // Ensure ts is always strictly greater than lastSeenTs so that items
              // added immediately after markAllSeen() register as unseen even when
              // both calls happen within the same wall-clock millisecond.
              ts: Math.max(Date.now(), s.lastSeenTs + 1),
              seen: false,
              type: item.type,
              payload: item.payload,
            },
            ...s.items,
          ].slice(0, CAP),
        }))
      },

      dismiss(id) {
        set((s) => ({ items: s.items.filter((n) => n.id !== id) }))
      },

      markAllSeen() {
        // Set lastSeenTs to cover all existing items (max of their ts values)
        // while staying 1ms behind "now" so that items added immediately after
        // this call produce ts = lastSeenTs + 1, which satisfies ts > lastSeenTs.
        const existingItems = get().items
        const maxItemTs = existingItems.reduce((m, n) => Math.max(m, n.ts), 0)
        set({ lastSeenTs: Math.max(maxItemTs, Date.now() - 1) })
      },
    }),
    {
      name: 'go_notif', // localStorage key — go_ prefix matches project convention
      storage: lazyStorage,
      onRehydrateStorage,
    },
  ),
)

// ---------------------------------------------------------------------------
// shouldFirePulse — pure two-guard predicate for today_pulse (D-05 / NOTIF-04)
//
// Returns true only when BOTH guards pass:
//   1. Date guard:   lastDate !== today  (new calendar day)
//   2. Status guard: lastStatus !== currentStatus (zone status changed)
//
// If currentStatus is null (no zone data available) the pulse must NOT fire.
// If lastDate is null (first run) and currentStatus is non-null, the pulse fires.
// ---------------------------------------------------------------------------
export function shouldFirePulse(
  lastDate: string | null,
  lastStatus: string | null,
  today: string,
  currentStatus: string | null,
): boolean {
  // Guard: no zone data → never fire
  if (currentStatus === null) return false
  // Guard: date must differ (new calendar day) AND status must differ
  return lastDate !== today && lastStatus !== currentStatus
}
