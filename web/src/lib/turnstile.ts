// turnstile.ts — Cloudflare Turnstile integration.
//
// Two paths share one config + one script load:
//   1. INTERACTIVE submit (ReportSheet): renders a VISIBLE widget in the form via
//      getTurnstileConfig() + ensureTurnstile(). If Cloudflare needs an interactive challenge
//      (VPN/Tor/CGNAT, common in The Gambia), the user can SEE and solve it — they're never
//      silently blocked. The common case still resolves on its own in ~1-2s.
//   2. OUTBOX FLUSH (no UI present): getTurnstileToken() mints a token from a hidden widget,
//      best-effort. If an interactive challenge is required it returns null and the report stays
//      queued (retried next flush). Returns null too when disabled/offline.
//
// Disabled (no site key from /api/go/turnstile) ⇒ everything is a no-op so dev/local keeps working.

interface TurnstileAPI {
  render: (el: HTMLElement | string, opts: Record<string, unknown>) => string
  execute: (id: string) => void
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI
  }
}

export interface TurnstileConfig {
  enabled: boolean
  siteKey: string
}

let configPromise: Promise<TurnstileConfig> | null = null
let scriptPromise: Promise<TurnstileAPI> | null = null

/** Cached config from /api/go/turnstile. enabled ⇒ a site key is set server-side. */
export function getTurnstileConfig(): Promise<TurnstileConfig> {
  if (!configPromise) {
    configPromise = fetch('/api/go/turnstile', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((j: { siteKey?: string; enabled?: boolean }) => ({
        enabled: j.enabled === true && !!j.siteKey,
        siteKey: j.siteKey || '',
      }))
      .catch(() => ({ enabled: false, siteKey: '' }))
  }
  return configPromise
}

/** Lazy-load the Turnstile script (render=explicit) and resolve once window.turnstile is ready. */
export function ensureTurnstile(): Promise<TurnstileAPI> {
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileAPI>((resolve, reject) => {
      if (window.turnstile) return resolve(window.turnstile)
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.onload = () => {
        let tries = 0
        const tick = () => {
          if (window.turnstile) return resolve(window.turnstile)
          if (tries++ > 100) return reject(new Error('turnstile not ready'))
          setTimeout(tick, 50)
        }
        tick()
      }
      s.onerror = () => reject(new Error('turnstile script failed to load'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

// ── hidden-widget fallback, used only by the outbox flush ────────────────────
let hiddenWidgetId: string | null = null
let pending: ((token: string | null) => void) | null = null

/** Best-effort token for the outbox flush (no visible widget). null ⇒ skip/retry later. */
export async function getTurnstileToken(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const cfg = await getTurnstileConfig()
  if (!cfg.enabled) return null
  try {
    const api = await ensureTurnstile()
    if (!hiddenWidgetId) {
      let host = document.getElementById('go-turnstile-hidden')
      if (!host) {
        host = document.createElement('div')
        host.id = 'go-turnstile-hidden'
        host.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;overflow:hidden'
        document.body.appendChild(host)
      }
      hiddenWidgetId = api.render(host, {
        sitekey: cfg.siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (t: string) => pending?.(t),
        'error-callback': () => pending?.(null),
        'timeout-callback': () => pending?.(null),
      })
    }
    return await new Promise<string | null>((resolve) => {
      let settled = false
      const finish = (t: string | null) => {
        if (settled) return
        settled = true
        pending = null
        resolve(t)
      }
      pending = finish
      setTimeout(() => finish(null), 4000)
      try {
        api.reset(hiddenWidgetId!)
        api.execute(hiddenWidgetId!)
      } catch {
        finish(null)
      }
    })
  } catch {
    pending = null
    return null
  }
}
