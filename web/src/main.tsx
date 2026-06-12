import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DesktopFrame } from '@/components/DesktopFrame'
import { initPwa } from '@/lib/pwa'
import { initLang } from '@/app/langStore'
import './index.css'

// Notch handling (runs at open, before first paint): env(safe-area-inset-top) auto-detects a REAL
// notch (viewport-fit=cover is set) — non-zero on notched phones, zero on notchless ones (where the
// header then expands to the very top). The phone-frame SIMULATOR draws a notch the cross-origin
// iframe can't expose, so it passes that inset via ?safeTop=<px>; we surface it as --go-sim-floor so
// `max(env, floor)` also clears the simulated island. Real devices never pass it → pure env detection.
try {
  const simFloor = Math.max(0, parseFloat(new URLSearchParams(location.search).get('safeTop') || '0') || 0)
  if (simFloor > 0) document.documentElement.style.setProperty('--go-sim-floor', `${simFloor}px`)
} catch {
  /* URL/CSSOM unavailable — fall back to pure env() detection */
}

// Register the beforeinstallprompt/appinstalled capture ASAP — Chrome can fire it before React mounts.
initPwa()
// Apply the persisted/detected UI language to <html lang/dir> before first paint (RTL for Arabic).
initLang()

// Battery / heat: when the app is hidden (screen off, or backgrounded while the radio keeps playing in
// the user's pocket) freeze every CSS animation — nothing should burn GPU/CPU off-screen. The polls
// already pause in the background (TanStack refetchIntervalInBackground=false); this covers the
// always-on animations (equalizer, LiveDot pulse, bulb flicker, name-stars, map-pin pulses). Resumes
// instantly on return. See the [data-app-hidden] rule in index.css.
try {
  const syncHidden = () => document.documentElement.toggleAttribute('data-app-hidden', document.hidden)
  document.addEventListener('visibilitychange', syncHidden)
  syncHidden()
} catch { /* visibility API unavailable — animations simply keep running */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopFrame>
      <App />
    </DesktopFrame>
  </StrictMode>,
)
