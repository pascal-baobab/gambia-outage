// useRealtime.ts — mount-once hook that wires PocketBase SSE realtime into the
// TanStack Query cache. Mounted in the app shell (App.tsx).
//
// Gated behind data-saver (CLAUDE.md "aggressive-lite"): when data-saver is on
// (manual toggle OR auto-detected saveData / 2g / slow-2g), we do NOT open the
// SSE connection at all — the app falls back to the existing 30s polling in
// useData.ts. Live SSE is a progressive enhancement, never a requirement.
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/app/store'
import { bindRealtime } from '@/lib/realtime-query'

export function useRealtime(): void {
  const qc = useQueryClient()
  const dataSaver = useAppStore((s) => s.dataSaver)

  useEffect(() => {
    if (dataSaver) return // 2G / saveData / toggle → rely on 30s polling
    const stop = bindRealtime(qc)
    return stop
    // Re-run when the data-saver flag flips so toggling it on tears the socket
    // down and toggling it off reopens it.
  }, [qc, dataSaver])
}
