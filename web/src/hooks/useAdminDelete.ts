// useAdminDelete.ts — long-press to delete, for superadmins OR moderators. Returns props to spread on
// any content card; when the device is neither, it returns nothing, so the public UX is untouched.
// Long-press (600ms, touch or mouse) or right-click → confirm → delete → onDeleted().
//   • superuser (lib/admin)      → SOFT-hide (reversible) via the superuser-gated endpoint
//   • moderator (lib/moderator)  → HARD-delete (irreversible, cascades) via the account-gated endpoint
// A moderator capability takes precedence (it's the explicitly-granted, stronger power).
import { useEffect, useRef, type CSSProperties, type HTMLAttributes } from 'react'
import { adminHide, useIsAdmin, type ModType } from '@/lib/admin'
import { useIsModerator, modDeleteContent } from '@/lib/moderator'
import { getAccountId } from '@/lib/account'

const HOLD_MS = 600

interface AdminDeleteResult {
  admin: boolean
  /** Spread on the card root to arm long-press / right-click delete (empty object when not admin). */
  bind: HTMLAttributes<HTMLElement>
  /** Subtle dashed ring so the owner can see what's deletable (empty when not admin). */
  ring: CSSProperties
}

export function useAdminDelete(
  type: ModType,
  id: string | undefined,
  onDeleted?: () => void,
  label = 'content',
): AdminDeleteResult {
  const admin = useIsAdmin()
  const mod = useIsModerator()
  const timer = useRef<number | undefined>(undefined)
  const acct = useRef<string>('')
  // ALL hooks must sit ABOVE the early return: `mod` flips false→true asynchronously (profile fetch),
  // so a hook below the guard changes the hook count between renders → React #310 → the whole app
  // crashes to the ErrorBoundary — but ONLY on moderator devices (that's why it passes everywhere else).
  const startPos = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => { getAccountId().then((x) => { acct.current = x }).catch(() => {}) }, [])

  const active = admin || mod
  if (!active || !id) return { admin: false, bind: {}, ring: {} }

  const hard = mod // moderator capability → irreversible hard delete; otherwise superuser soft-hide

  const fire = async () => {
    const msg = hard
      ? `Delete this ${label} PERMANENTLY? (moderator action — cannot be undone)`
      : `Delete this ${label}? (admin action — hides it for everyone)`
    // eslint-disable-next-line no-alert
    if (!window.confirm(msg)) return
    try {
      if (hard) {
        const accountId = acct.current || (await getAccountId())
        await modDeleteContent(type, id, accountId)
      } else {
        await adminHide(type, id)
      }
      onDeleted?.()
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }
  // iOS reliability: long-pressing over text starts the native selection + magnifier, whose touchmove
  // events would cancel our timer before HOLD_MS (so the delete never fires). Fix = (1) disable text
  // selection/callout on the active card (in `ring`), and (2) only cancel on a REAL drag (scroll),
  // not the finger jitter the magnifier produces.
  const MOVE_TOL = 12 // px — beyond this it's a scroll, not a hold

  const begin = (x: number, y: number) => {
    startPos.current = { x, y }
    timer.current = window.setTimeout(fire, HOLD_MS)
  }
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = undefined
  }
  const maybeCancel = (x: number, y: number) => {
    const s = startPos.current
    if (s && (Math.abs(x - s.x) > MOVE_TOL || Math.abs(y - s.y) > MOVE_TOL)) cancel()
  }

  return {
    admin: true,
    bind: {
      onTouchStart: (e) => { const t = e.touches[0]; if (t) begin(t.clientX, t.clientY) },
      onTouchEnd: cancel,
      onTouchMove: (e) => { const t = e.touches[0]; if (t) maybeCancel(t.clientX, t.clientY) },
      onMouseDown: (e) => begin(e.clientX, e.clientY),
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e) => {
        e.preventDefault()
        void fire()
      },
    },
    ring: {
      outline: '1.5px dashed rgba(229,72,77,0.5)',
      outlineOffset: 2,
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation',
    },
  }
}
