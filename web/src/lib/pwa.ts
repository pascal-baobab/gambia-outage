// pwa.ts — PWA install: detection, `beforeinstallprompt` capture, eligibility (Phase 6).
//
// The capture is MODULE-LEVEL and registered via initPwa() from main.tsx, because Chrome can
// fire `beforeinstallprompt` before React mounts — if we waited for a component effect we'd miss
// it. The pure parts (`detectPlatform`, `shouldShowInstall`) take their inputs as arguments so they
// are unit-testable without a DOM (see pwa.test.ts). No top-level side effects ⇒ safe to import.
import { PWA_REPROMPT_REPORTS } from './constants'

/** Minimal shape of the (non-standard) beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** Which install affordance fits the browser. iOS has no install event → we instruct instead. */
export type PwaPlatform = 'android' | 'ios-safari' | 'ios-other' | 'other'

const LS = {
  installed: 'go_pwa_installed', // '1' once installed → sheet permanently suppressed
  reportCount: 'go_report_count', // cumulative successful reports (lifetime engagement)
  dismissedAt: 'go_pwa_dismissed_at', // reportCount at the last dismissal (drives every-N re-show)
  screens: 'go_screens_seen', // distinct screens seen (engagement gate)
} as const

// ── safe localStorage helpers (private mode / SSR tolerant) ─────────────────
function readNum(key: string): number {
  try { return Number(localStorage.getItem(key)) || 0 } catch { return 0 }
}
function writeNum(key: string, n: number) {
  try { localStorage.setItem(key, String(n)) } catch { /* storage unavailable */ }
}
function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

// ── module state ────────────────────────────────────────────────────────────
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedFlag = false
let initDone = false
const seenThisSession = new Set<string>()
const listeners = new Set<() => void>()

function notify() { for (const fn of listeners) fn() }

/** Subscribe to capture/installed-state changes. Returns an unsubscribe fn. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ── installed detection ──────────────────────────────────────────────────────
/** True if the app is already installed/standalone (any signal). */
export function isInstalled(): boolean {
  if (installedFlag || readFlag(LS.installed)) return true
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true
  } catch { /* no DOM */ }
  return false
}

function markInstalled() {
  installedFlag = true
  deferredPrompt = null
  try { localStorage.setItem(LS.installed, '1') } catch { /* storage unavailable */ }
  notify()
}

// ── platform detection (UA only → picks the sheet body; pure/testable) ───────
export function detectPlatform(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): PwaPlatform {
  if (/iphone|ipad|ipod/i.test(ua)) {
    // iOS Safari can "Add to Home Screen"; iOS Chrome/Firefox/Edge/Opera cannot.
    return /crios|fxios|edgios|opios|mercury/i.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

/** Whether a native install dialog is available right now (Android/Chromium captured the event). */
export function hasDeferredPrompt(): boolean { return deferredPrompt != null }

// ── engagement / cadence counters ────────────────────────────────────────────
export function getReportCount(): number { return readNum(LS.reportCount) }
export function getScreensSeen(): number { return readNum(LS.screens) }
export function getDismissedAt(): number | null {
  try { const v = localStorage.getItem(LS.dismissedAt); return v == null ? null : Number(v) || 0 } catch { return null }
}

/** Count one successful report (online or queued) → re-evaluates eligibility. */
export function recordReport() {
  writeNum(LS.reportCount, getReportCount() + 1)
  try { window.dispatchEvent(new Event('go-report')) } catch { /* no DOM */ }
}

/** Note a distinct screen view this session → engagement gate (≥2). */
export function recordScreen(name: string) {
  if (seenThisSession.has(name)) return
  seenThisSession.add(name)
  writeNum(LS.screens, Math.max(getScreensSeen(), seenThisSession.size))
  try { window.dispatchEvent(new Event('go-screen')) } catch { /* no DOM */ }
}

/** User dismissed the sheet → snooze until PWA_REPROMPT_REPORTS more reports. */
export function dismissInstall() {
  writeNum(LS.dismissedAt, getReportCount())
  notify()
}

// ── eligibility (pure; the unit under test) ──────────────────────────────────
export interface InstallEligibility {
  installed: boolean
  platform: PwaPlatform
  reportCount: number
  screensSeen: number
  dismissedAt: number | null
}

/** §6.5 — may the auto sheet show? Pure: derives only from the passed state. */
export function shouldShowInstall(s: InstallEligibility): boolean {
  if (s.installed) return false
  if (s.platform === 'other') return false // can't prompt and can't sensibly instruct (e.g. desktop FF)
  const engaged = s.reportCount >= 1 || s.screensSeen >= 2
  if (!engaged) return false
  if (s.dismissedAt == null) return true
  return s.reportCount >= s.dismissedAt + PWA_REPROMPT_REPORTS
}

/** Read the live eligibility state from storage/UA (browser-side). */
export function readEligibility(): InstallEligibility {
  return {
    installed: isInstalled(),
    platform: detectPlatform(),
    reportCount: getReportCount(),
    screensSeen: getScreensSeen(),
    dismissedAt: getDismissedAt(),
  }
}

// ── native prompt ─────────────────────────────────────────────────────────────
/** Fire the captured native install dialog (Android/Chromium). Single-use. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const dp = deferredPrompt
  if (!dp) return 'unavailable'
  deferredPrompt = null // single-use
  try {
    await dp.prompt()
    const { outcome } = await dp.userChoice
    notify() // button disappears; appinstalled will persist installed-state on accept
    return outcome
  } catch {
    notify()
    return 'unavailable'
  }
}

// ── one-time listener registration (call from main.tsx) ──────────────────────
export function initPwa() {
  if (initDone || typeof window === 'undefined') return
  initDone = true
  if (isInstalled()) installedFlag = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // suppress Chrome's mini-infobar; we drive the UX
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => { markInstalled() })

  // Register the service worker ourselves (vite-plugin-pwa injectRegister is OFF) so we can pass
  // updateViaCache:'none'. Without it iOS may serve a STALE sw.js from its own HTTP cache on update
  // checks and pin the old worker — belt-and-suspenders with the no-cache header + the CF cache-bypass
  // rule. PROD-only: there is no built sw.js in dev (devOptions.enabled=false), so registering would 404.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        // Kick an explicit update check the moment registration resolves — on a slow link the app's
        // open-effect (appRefresh) may have run before register() settled; this guarantees discovery
        // starts as soon as the worker is live. appRefresh's ready-based tracking then catches it.
        .then((reg) => { reg.update().catch(() => { /* offline / no update */ }) })
        .catch(() => { /* registration failed — app still works online */ })
    })
  }
}
