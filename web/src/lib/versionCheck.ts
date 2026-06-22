// versionCheck.ts — independent build-version belt. Fetches the deployed /version.json (which the SW
// does NOT precache — `.json` is outside the precache glob and matches no runtime route — so it always
// reflects the ORIGIN build) and compares it to the APP_VERSION baked into the running bundle. A
// mismatch means this tab is running an OLDER build than what is deployed, even if the entire
// service-worker update path silently failed. We then ask appRefresh to hold the splash + surface the
// tap-to-reload pill. Cache-busted query + `cache: 'no-store'` so neither the browser nor the CF edge
// can serve a stale stamp — it needs no CF rule of its own.
import { APP_VERSION } from './constants'
import { notifyStaleBuild } from './appRefresh'

/** Read /version.json and, if it names a build newer than this bundle, flag the running build stale.
 *  No-ops offline / before the file is first deployed. Safe to call on open + on every foreground. */
export async function checkBuildStamp(): Promise<void> {
  if (typeof fetch === 'undefined') return
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { version?: string }
    if (data && typeof data.version === 'string' && data.version && data.version !== APP_VERSION) {
      notifyStaleBuild()
    }
  } catch {
    /* offline, or version.json not deployed yet — the SW path remains the primary channel */
  }
}
