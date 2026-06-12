// PushPrompt.tsx — shown right after a report (highest-intent moment): offer to get alerts for the
// zone the user just reported. On Android it requests permission + subscribes; on a non-installed
// iPhone (where Web Push needs the Home-Screen PWA) it routes to the install steps instead of a
// dead permission. Anonymous (the subscription carries no PII / report link).
import { useState } from 'react'
import { GPT_T, GPT_FONT } from '@/lib/tokens'
import { FLAG } from '@/lib/tokens'
import { useT } from '@/i18n/useT'

const PROMPTED_KEY = 'go_push_prompted'

export function markPrompted(zoneId: string): void {
  try {
    const set = new Set<string>(JSON.parse(localStorage.getItem(PROMPTED_KEY) || '[]'))
    set.add(zoneId)
    localStorage.setItem(PROMPTED_KEY, JSON.stringify([...set]))
  } catch { /* */ }
}
export function wasPrompted(zoneId: string): boolean {
  try { return new Set<string>(JSON.parse(localStorage.getItem(PROMPTED_KEY) || '[]')).has(zoneId) } catch { return false }
}

export function PushPrompt({ zone, onNeedsInstall, onClose, onToast }: {
  zone: { id: string; name: string }
  onNeedsInstall: () => void
  onClose: () => void
  onToast: (t: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const t = useT()

  async function enable() {
    setBusy(true)
    try {
      const { canReceivePush, subscribeToZone } = await import('@/lib/push')
      if (!canReceivePush()) {
        // iOS, not installed → guide to Add-to-Home-Screen; push works from the installed PWA.
        onClose()
        onNeedsInstall()
        return
      }
      // subscribeToZone catches internally, but a throw from the dynamic import/anything else must
      // still surface a toast — a silent close here looked like the button simply did nothing.
      let res = 'failed'
      try { res = await subscribeToZone(zone.id, ['out', 'back']) } catch { res = 'failed' }
      const msg: Record<string, string> = {
        subscribed: t.push.subscribedToast(zone.name),
        denied: t.push.deniedToast,
        unsupported: t.push.unsupportedToast,
        unavailable: t.push.unavailableToast,
        failed: t.push.failedToast,
      }
      onToast(msg[res] || msg.failed)
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 94, padding: '0 12px calc(12px + env(safe-area-inset-bottom))', fontFamily: GPT_FONT }}>
      <div style={{ background: GPT_T.paper, border: `1px solid ${GPT_T.line}`, borderRadius: 16, padding: '14px 15px', boxShadow: '0 12px 32px rgba(15,23,34,0.22)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>🔔</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.25 }}>{t.push.question(zone.name)}</div>
          <div style={{ fontSize: 12.5, color: GPT_T.ink45, fontWeight: 600, marginTop: 2 }}>{t.push.description}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={enable} disabled={busy} style={{ minHeight: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: busy ? GPT_T.line : FLAG.green, color: '#fff', fontFamily: GPT_FONT, fontWeight: 800, fontSize: 13.5, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? '…' : t.push.enable}
          </button>
          <button onClick={onClose} style={{ minHeight: 30, padding: '0 16px', borderRadius: 10, border: 'none', background: 'transparent', color: GPT_T.ink45, fontFamily: GPT_FONT, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
            {t.push.notNow}
          </button>
        </div>
      </div>
    </div>
  )
}
