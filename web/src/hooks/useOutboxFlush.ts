// useOutboxFlush.ts — flush the offline report outbox on app start and whenever the device
// comes back online. Invalidates read-model caches after a successful flush so the UI reflects
// the now-delivered reports. Mounted once in the app shell (App.tsx).
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createReport, isDuplicateError } from '@/lib/api'
import { flushOutbox, onOutboxChange } from '@/lib/outbox'

export function useOutboxFlush(onFlushed?: (sent: number) => void) {
  const qc = useQueryClient()

  useEffect(() => {
    let active = true

    const run = async () => {
      const { sent } = await flushOutbox(
        async (input) => { await createReport(input) },
        isDuplicateError,
      )
      if (active && sent > 0) {
        qc.invalidateQueries({ queryKey: ['snapshot'] })
        qc.invalidateQueries({ queryKey: ['national'] })
        qc.invalidateQueries({ queryKey: ['macro'] })
        onFlushed?.(sent)
      }
    }

    // flush on mount (covers iOS first-foreground), on reconnect, and when something is queued
    run()
    const onOnline = () => run()
    window.addEventListener('online', onOnline)
    const unsub = onOutboxChange(() => { if (navigator.onLine !== false) run() })

    return () => {
      active = false
      window.removeEventListener('online', onOnline)
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
