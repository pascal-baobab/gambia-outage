// realtime-query.ts — bridge the SSE stream (realtime.ts) to TanStack Query.
//
// Each `events` message is treated as a cheap invalidation SIGNAL, not a source
// of truth: we never trust the raw `events` payload for derived fields
// (sev/status/confirms live in the recomputed read-models). On a message we
// debounce ~1.5s and coalesce by zone, then invalidate the affected queries so
// TanStack Query refetches the freshly-recomputed read-models — at most one
// snapshot + one national + one-per-dirty-macro refetch per burst (a single
// zone going OUT can fire 8+ events in a minute via the confirm threshold).

import type { QueryClient } from '@tanstack/react-query'
import { onRealtime, startRealtime, stopRealtime } from './realtime'
import { qk } from './queryKeys'
import type { Snapshot } from './types'

const DEBOUNCE_MS = 1500

/**
 * Resolve an `events` record's `zone` id to its macro (region) id.
 * Snapshot macros are region ids: a region zone maps to itself. Settlement
 * zones aren't in the snapshot macro list, so we can't resolve their parent
 * here — but a snapshot refetch already updates the macro pin, and the open
 * ZoneScreen (useMacro) refetches on focus/poll, so returning null is safe.
 */
function resolveMacro(qc: QueryClient, zoneId: string): string | null {
  const snap = qc.getQueryData<Snapshot>(qk.snapshot)
  if (snap?.macros.some((m) => m.id === zoneId)) return zoneId
  return null
}

/**
 * Wire realtime → query cache. Opens the SSE connection and returns a teardown
 * fn that detaches the handler, cancels the pending flush, and closes the
 * socket. Call only when data-saver is OFF (gate upstream in useRealtime).
 */
export function bindRealtime(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const dirtyMacros = new Set<string>()
  let dirtySnapshot = false

  const flush = () => {
    timer = null
    if (dirtySnapshot) {
      void qc.invalidateQueries({ queryKey: qk.snapshot })
      void qc.invalidateQueries({ queryKey: qk.national })
      dirtySnapshot = false
    }
    for (const id of dirtyMacros) {
      void qc.invalidateQueries({ queryKey: qk.macro(id) })
    }
    dirtyMacros.clear()
  }

  const unsub = onRealtime((e) => {
    // Any events change moves the national/snapshot numbers.
    dirtySnapshot = true
    const zone = String((e.record as { zone?: unknown }).zone ?? '')
    if (zone) {
      const macroId = resolveMacro(qc, zone)
      if (macroId) dirtyMacros.add(macroId)
    }
    // Debounce + coalesce: a burst of confirmations → ONE refetch pass.
    if (!timer) timer = setTimeout(flush, DEBOUNCE_MS)
  })

  startRealtime()

  return () => {
    unsub()
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    stopRealtime()
  }
}
