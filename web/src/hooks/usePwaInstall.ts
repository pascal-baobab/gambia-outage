// usePwaInstall.ts — React surface over lib/pwa (Phase 6). Re-renders on capture/installed
// changes (subscribe) and on engagement events (go-report / go-screen), then recomputes
// eligibility from live storage. Pure logic + capture live in lib/pwa (unit-tested there).
import { useEffect, useReducer } from 'react'
import {
  subscribe,
  readEligibility,
  shouldShowInstall,
  hasDeferredPrompt,
  promptInstall,
  dismissInstall,
  initPwa,
  type PwaPlatform,
} from '@/lib/pwa'

export interface PwaInstall {
  installed: boolean
  platform: PwaPlatform
  /** Auto-sheet eligible right now (engaged, not installed, cadence satisfied). */
  canShow: boolean
  /** A native install dialog is available (Android/Chromium). */
  canPrompt: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  dismiss: () => void
}

export function usePwaInstall(): PwaInstall {
  const [, force] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    initPwa() // idempotent safety net (main.tsx calls it first)
    const unsub = subscribe(force)
    const onEngage = () => force()
    window.addEventListener('go-report', onEngage)
    window.addEventListener('go-screen', onEngage)
    return () => {
      unsub()
      window.removeEventListener('go-report', onEngage)
      window.removeEventListener('go-screen', onEngage)
    }
  }, [])

  const elig = readEligibility()
  return {
    installed: elig.installed,
    platform: elig.platform,
    canShow: shouldShowInstall(elig),
    canPrompt: hasDeferredPrompt(),
    promptInstall,
    dismiss: dismissInstall,
  }
}
