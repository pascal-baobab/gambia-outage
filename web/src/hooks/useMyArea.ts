// useMyArea.ts — pinned "My area" + return-to-power alert prefs (localStorage).
// Mirrors the prototype's gpt_myarea / gpt_alerts state (renamed go_*).
import { useEffect } from 'react'
import { useLocal } from './useLocal'

// One silent re-subscribe per app session: refreshes the server rows' `updated` so active devices
// are never evicted past SUB_MAX (stalest-first). Module flag — useMyArea mounts in several places.
let heartbeatSent = false

export interface MyArea {
  id: string
  name: string
  region: string
  regionId: string
  kind: 'region' | 'quarter'
}

export interface AlertEntry {
  id: string
  name: string
}

export function useMyArea() {
  const [myArea, setMyArea] = useLocal<MyArea | null>('go_myarea', null)
  const [alerts, setAlerts] = useLocal<AlertEntry[]>('go_alerts', [])

  // Bell heartbeat (never prompts — permission-granted + existing subscription only).
  useEffect(() => {
    if (heartbeatSent || alerts.length === 0) return
    heartbeatSent = true
    const ids = alerts.map((a) => a.id)
    import('@/lib/push')
      .then(({ refreshPushSubscriptions }) => refreshPushSubscriptions(ids))
      .catch(() => { /* best-effort */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alertOn = (id: string) => alerts.some((a) => a.id === id)

  const toggleAlert = (entry: AlertEntry) => {
    if (alertOn(entry.id)) setAlerts(alerts.filter((a) => a.id !== entry.id))
    else setAlerts([...alerts, entry])
  }

  /**
   * Toggle the "power back" alert AND register/remove the Web Push subscription.
   * Push code is lazy-imported so it never blocks first paint. Returns a status the caller
   * can surface (e.g. a toast): 'on' | 'off' | 'denied' | 'unavailable' | 'unsupported'.
   * The localStorage flag is only flipped to ON if the subscription actually succeeded.
   */
  const toggleAlertWithPush = async (
    entry: AlertEntry,
    zoneId: string,
  ): Promise<'on' | 'off' | 'denied' | 'unavailable' | 'unsupported' | 'failed'> => {
    if (alertOn(entry.id)) {
      const remaining = alerts.filter((a) => a.id !== entry.id)
      setAlerts(remaining)
      try {
        // Multi-zone (2026-06-12): drop only THIS zone's bell server-side; the browser push
        // subscription is torn down only when no bells remain on this device.
        const { unsubscribeZone, unsubscribe } = await import('@/lib/push')
        await unsubscribeZone(zoneId)
        if (remaining.length === 0) await unsubscribe()
      } catch { /* best-effort */ }
      return 'off'
    }
    try {
      const { subscribeToZone } = await import('@/lib/push')
      const res = await subscribeToZone(zoneId)
      if (res === 'subscribed') {
        setAlerts([...alerts, entry])
        return 'on'
      }
      if (res === 'denied') return 'denied'
      if (res === 'unsupported') return 'unsupported'
      if (res === 'unavailable') {
        // server has no VAPID configured yet → still record the local intent so the UI reflects it
        setAlerts([...alerts, entry])
        return 'unavailable'
      }
      return 'failed'
    } catch {
      return 'failed'
    }
  }

  /** Pin an area. `id` shaped "<region>" (macro) or "<region>-<n>" (quarter). */
  const pinArea = (area: { id: string; name: string; region: string }) => {
    const isQ = String(area.id).includes('-')
    setMyArea({
      id: area.id,
      name: area.name,
      region: area.region,
      regionId: isQ ? String(area.id).split('-')[0] : area.id,
      kind: isQ ? 'quarter' : 'region',
    })
  }

  const clearArea = () => setMyArea(null)

  return { myArea, pinArea, clearArea, alerts, alertOn, toggleAlert, toggleAlertWithPush }
}
