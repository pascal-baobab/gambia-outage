// appRefresh.ts — "reset on reopen", hidden behind the splash banner.
// On every cold open we (1) trigger fresh read-models (caller invalidates the query cache) and
// (2) check for a newer DEPLOYED app version. If a new service worker is found, our sw.ts skipWaiting()s
// on install → it activates → `controllerchange` fires → we reload ONCE, under the ~2.5s splash, so the
// user always lands on the latest build with fresh data and never sees a jarring mid-session reload.
//
// Safety rails:
//  - The auto-reload is ARMED only for the splash window (~6s after open), then disarmed — a version
//    that lands later in the session installs silently and applies on the NEXT cold open, not mid-use.
//  - We attach the reload listener only when the page was ALREADY controlled at startup, so the very
//    first install's clients.claim() does not trigger a needless reload.
//  - A sessionStorage guard caps it at one reload per tab session (no reload loops).

const RELOAD_GUARD = 'go_sw_reloaded'
// Kept in sync with SplashScreen's extended update-hold (enterMs 4500 + UPDATE_HOLD_MS 12000 ≈ 16.5s):
// on slow networks the new SW must precache the whole build before it can activate, so the under-splash
// reload must stay armed for the WHOLE extended hold — otherwise the reload lands after the window and
// is suppressed, leaving the user on the old build. Small buffer over the splash deadline.
const ARM_WINDOW_MS = 17000

// On iOS the PWA is often resumed from suspension (JS doesn't re-execute, splash never re-shows).
// Trigger a passive update check whenever the app comes back to the foreground so the next cold open
// picks up the latest build even when the current session never had a real cold start.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
}

let wired = false
let reloadArmed = false
// True once a newer service worker has been FOUND and is installing/activating — i.e. an under-splash
// reload is imminent. The splash polls this (isUpdateApplying) to hold its animation a little longer so
// the reload lands WHILE the splash is showing, instead of after the user has already entered the app.
let updateApplying = false

/** True when a newer build was detected on this open and its reload hasn't landed yet. */
export function isUpdateApplying(): boolean {
  return updateApplying
}

/**
 * Call once when the app opens (the splash is showing). Arms the under-splash version reload and kicks
 * off a service-worker update check. Safe to call when service workers are unavailable (no-op).
 */
export function applyVersionUpdateOnOpen(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  // Arm the auto-reload for the splash window only; disarm afterwards so later updates never reload
  // the page out from under an active user.
  reloadArmed = true
  window.setTimeout(() => { reloadArmed = false }, ARM_WINDOW_MS)

  if (!wired) {
    wired = true
    const sw = navigator.serviceWorker
    // Only a NEW worker taking over should reload; the first-ever claim (no prior controller) shouldn't.
    if (sw.controller) {
      let refreshing = false
      sw.addEventListener('controllerchange', () => {
        if (!reloadArmed || refreshing) return
        try { if (sessionStorage.getItem(RELOAD_GUARD)) return } catch { /* storage unavailable */ }
        refreshing = true
        try { sessionStorage.setItem(RELOAD_GUARD, '1') } catch { /* storage unavailable */ }
        window.location.reload()
      })
    }
  }

  checkForUpdate()
}

/** Ask the registered SW to look for a new build (and nudge any already-waiting worker to activate).
 *  Flags `updateApplying` the moment a newer worker appears, so the splash can hold for the reload. */
export function checkForUpdate(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (!reg) return
      // A worker already downloaded/installed but not yet controlling → an update is mid-flight.
      if (reg.installing || reg.waiting) updateApplying = true
      // A brand-new worker discovered by update() → mark applying so the splash waits it out.
      reg.addEventListener('updatefound', () => { if (reg.installing || reg.waiting) updateApplying = true })
      reg.update().catch(() => { /* offline / no update */ })
      if (reg.waiting) {
        try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }) } catch { /* sw ignores; skipWaiting is automatic */ }
      }
    })
    .catch(() => { /* no registration yet */ })
}
