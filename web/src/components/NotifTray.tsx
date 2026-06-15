// NotifTray.tsx — notification bottom-sheet tray.
//
// Opens from the bell button in AppHeader.
// On mount: marks all notifications seen (clears the badge).
// Footer holds the 3 displaced InfoPanel actions: WhatsApp, Update+reload, About.
// RTL: mirrors in Arabic (direction:rtl) via langStore.
// Privacy: renders only allowed display strings per type — zero IDs.
// Security: all notification text rendered via JSX text children (auto-escaped, no dangerouslySetInnerHTML).

import { useEffect } from 'react'
import { useNotifStore } from '@/app/notifStore'
import type { NotifItem, NotifType } from '@/app/notifStore'
import { useLang } from '@/app/langStore'
import { useT } from '@/i18n/useT'
import { GPTIcon } from '@/components/icons'
import { GPT_T, GPT_FONT, FLAG, ACCENT, THEMES } from '@/lib/tokens'
import { openWhatsAppText } from '@/lib/whatsappShare'
import { checkForUpdate } from '@/lib/appRefresh'
import { APP_VERSION } from '@/lib/constants'

// ---------------------------------------------------------------------------
// One-time keyframe injection (matches notification-center.jsx pattern)
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined' && !document.getElementById('nc-kf')) {
  const s = document.createElement('style')
  s.id = 'nc-kf'
  s.textContent =
    '@keyframes ncSheetIn{from{transform:translateY(40px);opacity:.5}to{transform:translateY(0);opacity:1}}' +
    '@keyframes ncFade{from{opacity:0}to{opacity:1}}'
  document.head.appendChild(s)
}

// ---------------------------------------------------------------------------
// rgba helper — hex token → rgba string (no new hex literals)
// ---------------------------------------------------------------------------
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// ---------------------------------------------------------------------------
// Per-type accent colour lookup
// ---------------------------------------------------------------------------
const TYPE_ACCENT: Record<NotifType, string> = {
  xp_rankup: ACCENT.star,         // #FFD700
  outbox_delivered: FLAG.green,   // #3A7728
  push_alert: ACCENT.live,        // #E0245E
  today_pulse: THEMES.standard.on, // #E08A00
  message: GPT_T.ink45,           // reserved, never rendered
}

// ---------------------------------------------------------------------------
// StarGlyph — 4-point star SVG for xp_rankup badge
// ---------------------------------------------------------------------------
function StarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <path
        d="M12 3.2l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 21l-5.1 2.6 1.1-5.7-4.3-4 5.8-.7L12 3.2Z"
        fill={color}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// PulseSpark — inline sparkline for today_pulse rows
// ---------------------------------------------------------------------------
function PulseSpark({ color }: { color: string }) {
  const data = [3, 5, 4, 8, 12, 9, 14, 11, 7, 5]
  const w = 52
  const h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data
    .map((v, i) => {
      const x = ((i / (data.length - 1)) * w).toFixed(1)
      const y = (h - ((v - min) / (max - min || 1)) * (h - 4) - 2).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
  const lastY = parseFloat(pts.split(' ').pop()!.split(',')[1])
  return (
    <svg width={w} height={h} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY} r="2.4" fill={color} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// NotifBadgeIcon — 40×40 left icon badge per type
// ---------------------------------------------------------------------------
function NotifBadgeIcon({ type, accent }: { type: NotifType; accent: string }) {
  return (
    <span
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: rgba(accent, 0.12),
      }}
    >
      {type === 'xp_rankup' && <StarGlyph size={22} color={accent} />}
      {type === 'outbox_delivered' && <GPTIcon name="check" size={23} color={accent} />}
      {type === 'push_alert' && <GPTIcon name="bell" size={22} color={accent} />}
      {type === 'today_pulse' && <GPTIcon name="on" size={22} color={accent} />}
    </span>
  )
}

// ---------------------------------------------------------------------------
// NotifRow — single notification list item
//
// Privacy: renders ONLY the allowed display string per type.
// No IDs (report_id / event_id / rl_key / ip_key) are accessed.
// XSS: all strings rendered as JSX text children (React auto-escapes).
// ---------------------------------------------------------------------------
function NotifRow({
  item,
  onDismiss,
  dismissAria,
}: {
  item: NotifItem
  onDismiss: (id: string) => void
  dismissAria: string
}) {
  const accent = TYPE_ACCENT[item.type]
  const isUnread = !item.seen

  // Extract allowed display string per type — zero IDs exposed
  let subtitle = ''
  const p = item.payload as Record<string, unknown>
  if (item.type === 'xp_rankup' && typeof p.newRankLabel === 'string') {
    subtitle = p.newRankLabel
  } else if (item.type === 'outbox_delivered' && typeof p.place === 'string') {
    subtitle = p.place
  } else if (item.type === 'push_alert' && typeof p.body === 'string') {
    subtitle = p.body
  } else if (item.type === 'today_pulse' && typeof p.zone === 'string' && typeof p.status === 'string') {
    subtitle = `${p.zone} · ${p.status}`
  }

  // Title from the notification type
  const t = useT()
  const titleMap: Record<NotifType, string> = {
    xp_rankup: t.notif.type.xp_rankup,
    outbox_delivered: t.notif.type.outbox_delivered,
    push_alert: t.notif.type.push_alert,
    today_pulse: t.notif.type.today_pulse,
    message: t.notif.type.message,
  }

  // Relative timestamp (seconds → readable label)
  const age = Date.now() - item.ts
  const ageMins = Math.round(age / 60000)
  const ageHours = Math.round(age / 3600000)
  const ageLabel =
    ageMins < 2 ? t.notif.time.justNow
    : ageMins < 60 ? t.notif.time.minutes(ageMins)
    : ageHours < 24 ? t.notif.time.hours(ageHours)
    : t.notif.time.days(Math.round(ageHours / 24))

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: isUnread ? rgba(accent, 0.05) : GPT_T.paper,
        border: `1px solid ${GPT_T.line}`,
        borderInlineStart: `3px solid ${isUnread ? accent : GPT_T.line}`,
        borderRadius: 14,
        padding: '12px 12px 12px 13px',
        fontFamily: GPT_FONT,
      }}
    >
      <NotifBadgeIcon type={item.type} accent={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.25 }}>
            {titleMap[item.type]}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: GPT_T.ink45,
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {ageLabel}
          </span>
        </div>
        {subtitle ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
            <span
              style={{ flex: 1, fontSize: 12, fontWeight: 600, color: GPT_T.ink70, lineHeight: 1.4 }}
            >
              {subtitle}
            </span>
            {item.type === 'today_pulse' && <PulseSpark color={THEMES.standard.on} />}
          </div>
        ) : null}
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label={dismissAria}
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginInlineEnd: -2,
          marginTop: -2,
          padding: 0,
        }}
      >
        <GPTIcon name="close" size={15} color={GPT_T.ink25} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WhatsAppGlyph — SVG path (matches notification-center.jsx + InfoPanel)
// ---------------------------------------------------------------------------
function WhatsAppGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.5c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31s-.87.85-.87 2.07c0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// FooterRow — single footer action button
// ---------------------------------------------------------------------------
function FooterRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'start',
        background: GPT_T.paper,
        border: `1px solid ${GPT_T.line}`,
        borderRadius: 13,
        padding: '11px 13px',
        cursor: 'pointer',
        fontFamily: GPT_FONT,
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: GPT_T.wash,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2 }}>
          {label}
        </span>
        {sub && (
          <span
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GPT_T.ink45, marginTop: 1, lineHeight: 1.3 }}
          >
            {sub}
          </span>
        )}
      </span>
      <GPTIcon name="chevron" size={17} color={GPT_T.ink25} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// NotifTray — main exported component
// ---------------------------------------------------------------------------
export function NotifTray({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  const items = useNotifStore((s) => s.items)
  const dismiss = useNotifStore((s) => s.dismiss)
  const t = useT()
  const lang = useLang((s) => s.lang)
  const isRtl = lang === 'ar'

  // D-04: mark all seen on mount — clears the badge immediately on open.
  // scrim/close dismissal does NOT re-mark (already marked from open).
  useEffect(() => {
    useNotifStore.getState().markAllSeen()
  }, [])

  // Filter out reserved 'message' type (v2.1 no-op) and render the remaining list
  const visibleItems = items.filter((n) => n.type !== 'message')

  const hasUnread = visibleItems.some((n) => !n.seen)

  const handleUpdate = () => {
    checkForUpdate()
    window.setTimeout(() => window.location.reload(), 350)
  }

  return (
    // Full-viewport overlay wrapper (scrim + sheet)
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 85,
      }}
    >
      {/* Scrim — closes tray, does NOT re-mark-all-seen */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,34,0.5)',
          animation: 'ncFade .3s ease both',
        }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: GPT_T.paper,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -16px 50px rgba(15,23,34,0.3)',
          zIndex: 90,
          maxHeight: '92%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: GPT_FONT,
          direction: isRtl ? 'rtl' : 'ltr',
          animation: 'ncSheetIn .34s cubic-bezier(.2,.8,.25,1) both',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              background: GPT_T.line,
            }}
          />
        </div>

        {/* Header row: title + mark-all + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '8px 16px 12px',
          }}
        >
          <div style={{ fontSize: 19, fontWeight: 800, color: GPT_T.ink, lineHeight: 1.2 }}>
            {t.notif.tray.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {hasUnread && (
              <button
                onClick={() => useNotifStore.getState().markAllSeen()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: FLAG.blue,
                  fontFamily: GPT_FONT,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 9,
                  lineHeight: 1,
                }}
              >
                {t.notif.tray.markAll}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label={t.notif.tray.close}
              style={{
                width: 34,
                height: 34,
                border: 'none',
                background: GPT_T.wash,
                cursor: 'pointer',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <GPTIcon name="close" size={18} color={GPT_T.ink70} />
            </button>
          </div>
        </div>

        {/* Scrollable notification list + empty state + footer */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '0 16px 16px',
          }}
        >
          {visibleItems.length === 0 ? (
            /* Empty state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '14px 24px 30px',
              }}
            >
              {/* Illustration — placeholder bell-off icon until bundle SVG asset is delivered */}
              <GPTIcon name="bell-off" size={64} color={GPT_T.line} />
              <div
                style={{ fontSize: 17, fontWeight: 800, color: GPT_T.ink, marginTop: 6, lineHeight: 1.2 }}
              >
                {t.notif.empty.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: GPT_T.ink45,
                  marginTop: 6,
                  lineHeight: 1.45,
                  maxWidth: 240,
                }}
              >
                {t.notif.empty.sub}
              </div>
            </div>
          ) : (
            /* Notification rows */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {visibleItems.map((item) => (
                <NotifRow
                  key={item.id}
                  item={item}
                  onDismiss={dismiss}
                  dismissAria={t.notif.dismiss.aria}
                />
              ))}
            </div>
          )}

          {/* Footer — displaced InfoPanel actions: WhatsApp → Update → About */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${GPT_T.line2}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            <FooterRow
              icon={<WhatsAppGlyph size={19} color={ACCENT.whatsapp} />}
              label={t.notif.footer.share}
              onClick={openWhatsAppText}
            />
            <FooterRow
              icon={<GPTIcon name="info" size={19} color={GPT_T.ink70} />}
              label={t.notif.footer.update}
              sub={`v${APP_VERSION}`}
              onClick={handleUpdate}
            />
            <FooterRow
              icon={<GPTIcon name="shield" size={19} color={GPT_T.ink70} />}
              label={t.notif.footer.about}
              onClick={onAbout}
            />
          </div>

          {/* Safe-area inset clearance for notched devices */}
          <div style={{ height: 'calc(12px + env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
