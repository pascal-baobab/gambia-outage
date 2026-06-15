// BellButton.tsx — notification bell icon with unread badge overlay.
// Pure component: receives unseenCount and onOpen as props; reads no store directly.
// Badge must never mirror in RTL — wrapper is always direction:ltr (D-14).
// Zero dependency on Notification.permission (NOTIF-07).
import { GPT_T, ACCENT } from '@/lib/tokens'
import { GPTIcon } from '@/components/icons'
import { useT } from '@/i18n/useT'

export function BellButton({
  unseenCount,
  onOpen,
}: {
  unseenCount: number
  onOpen: () => void
}) {
  const t = useT()

  const ariaLabel =
    unseenCount > 0
      ? t.notif.bell.ariaUnread(unseenCount)
      : t.notif.bell.aria

  return (
    // direction:ltr is mandatory here — badge position must not flip in RTL
    // (D-14: belt-and-suspenders even though AppHeader is already direction:ltr).
    <div style={{ position: 'relative', direction: 'ltr' }}>
      <button
        onClick={onOpen}
        aria-label={ariaLabel}
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <GPTIcon name="bell" size={22} color={GPT_T.ink45} />
      </button>

      {/* Badge: only rendered when there are unseen items */}
      {unseenCount > 0 && (
        unseenCount === 1 ? (
          /* Dot badge — 9x9 circle, top-right corner */
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 9,
              height: 9,
              borderRadius: 999,
              background: ACCENT.live,
              border: `1.5px solid ${GPT_T.paper}`,
              pointerEvents: 'none',
            }}
          />
        ) : (
          /* Count pill — min-width 16, height 16, shows number or "9+" */
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -5,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: ACCENT.live,
              border: `1.5px solid ${GPT_T.paper}`,
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              pointerEvents: 'none',
            }}
          >
            {unseenCount >= 10 ? '9+' : unseenCount}
          </span>
        )
      )}
    </div>
  )
}
