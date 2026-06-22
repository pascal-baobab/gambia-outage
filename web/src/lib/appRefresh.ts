// appRefresh.ts — "land on the latest build" on every cold open, robust on iOS standalone PWAs.
//
// Why the old timer-based version kept stranding iPhones on the OLD build (diagnosed 2026-06-22):
//  - the under-splash reload was gated on a 17s WALL-CLOCK arm window; a ~1.8MB precache over a slow
//    Gambian link finishes AFTER that window, so the (late) activation was suppressed → stuck on old;
//  - it relied on `controllerchange`, which iOS 16 standalone delivers unreliably to an already-open
//    page — worsened by clients.claim() not being inside waitUntil (fixed in sw.ts);
//  - it only set "updateApplying" from a synchronous read of reg.installing/waiting (both null at cold
//    open, since discovery is async), never from a worker `statechange` listener, so the splash often
//    never held; and a sessionStorage reload-guard PERSISTED across iOS reopens, pre-suppressing reloads.
//
// New model (no timers): we TRACK the discovered worker via `statechange` and reload exactly once when
// it ACTIVATES (controllerchange-independent) OR when controllerchange fires — whichever comes first.
// The reload is gated on whether the SPLASH is masking the screen: under the splash we reload silently
// (smooth); once the user is in the app we surface a non-blocking tap-to-reload pill instead of yanking
// a reload out from under them. An independent version.json belt (lib/versionCheck) flips the same
// in-flight flag so the splash holds even if the SW path is slow/silent.

/** Window event dispatched when a newer build is known to be available but cannot be auto-applied under
 *  the splash (the user is already in the app, or the SW path went silent). App surfaces a pill on it. */
export const STALE_BUILD_EVENT = 'go-stale-build'

let updateApplying = false // a newer build is in flight this foreground → splash holds + isUpdateApplying()
let refreshing = false // exactly one reload per JS execution context (loop guard — no sessionStorage)
let splashVisible = false // true while the launch splash masks the screen → safe to auto-reload under it
let hadController = false // was the page already SW-controlled at startup? false = first-ever install
let wired = false
let staleDetected = false

/** True when a newer build was detected on this open and its reload hasn't landed yet (splash polls it). */
export function isUpdateApplying(): boolean {
  return updateApplying
}

/** True once a newer build has been detected (drives the tap-to-reload pill once the splash is gone). */
export function isStaleBuild(): boolean {
  return staleDetected
}

/** SplashScreen reports whether it is currently masking the screen, so a new-build swap reloads UNDER
 *  the splash (smooth) but, once the user is in the app, surfaces a pill instead of a jarring reload. */
export function setSplashVisible(v: boolean): void {
  splashVisible = v
}

function announceStale(): void {
  staleDetected = true
  try {
    window.dispatchEvent(new Event(STALE_BUILD_EVENT))
  } catch {
    /* no DOM */
  }
}

/** The single, guarded reload decision. Auto-reload only while the splash masks the swap; otherwise
 *  surface the pill. Never reloads on the first-ever install (no prior controller → nothing to leave). */
function applyReload(): void {
  if (refreshing) return
  if (!hadController) return
  if (splashVisible) {
    refreshing = true
    window.location.reload()
  } else {
    announceStale()
  }
}

/** Track a discovered worker to completion: mark the update in-flight (so the splash holds), nudge it
 *  to skip waiting the instant it is INSTALLED (iOS rarely exposes a stable 'waiting' phase, so the page
 *  can't depend on reg.waiting being non-null), and reload when it ACTIVATES. Idempotent per worker. */
function watch(worker: ServiceWorker | null): void {
  if (!worker) return
  updateApplying = true
  const evaluate = () => {
    if (worker.state === 'installed') {
      try {
        worker.postMessage({ type: 'SKIP_WAITING' })
      } catch {
        /* sw promotes via its eager skipWaiting() anyway */
      }
    } else if (worker.state === 'activated') {
      applyReload()
    }
  }
  worker.addEventListener('statechange', evaluate)
  evaluate() // a worker can already be past 'installing' by the time we attach
}

/** Ask the active registration to look for a new build and wire tracking for whatever it finds. Uses
 *  navigator.serviceWorker.ready (resolves once a registration is active) — NOT getRegistration(),
 *  which can be null if the open-effect runs before the load-deferred register() resolves (a real race
 *  on slow links). Safe to call repeatedly (visibilitychange/foreground) — listeners are idempotent. */
export function checkForUpdate(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((reg) => {
      if (reg.waiting) watch(reg.waiting)
      if (reg.installing) watch(reg.installing)
      reg.addEventListener('updatefound', () => watch(reg.installing))
      reg.update().catch(() => {
        /* offline / no update */
      })
    })
    .catch(() => {
      /* no registration */
    })
}

/** Independent build-version belt (lib/versionCheck): the deployed version.json differs from the
 *  APP_VERSION baked into this bundle → we KNOW the running build is stale even if the whole SW path
 *  silently no-ops. Hold the splash for it; if the user is already in the app, surface the pill. */
export function notifyStaleBuild(): void {
  updateApplying = true
  announceStale()
}

/** Call once when the app opens (the splash is showing). Wires the controllerchange reload path and
 *  kicks an update check. Safe when service workers are unavailable (no-op). */
export function applyVersionUpdateOnOpen(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (!wired) {
    wired = true
    hadController = !!navigator.serviceWorker.controller
    // A new worker taking control → reload (guarded). This is the SECOND of the two reload paths (the
    // first is the 'activated' statechange in watch()); the shared `refreshing` flag = exactly one reload.
    navigator.serviceWorker.addEventListener('controllerchange', () => applyReload())
  }
  checkForUpdate()
}
