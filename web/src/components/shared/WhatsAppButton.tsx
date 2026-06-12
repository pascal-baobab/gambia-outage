// WhatsAppButton.tsx — reusable one-tap WhatsApp share, droppable anywhere (headers, splash, etc.).
// Shares a WhatsApp message whose link is EXACTLY https://gambiaoutage.com (the exact address to open
// /install the app on Android) — link-first via wa.me, so the URL always travels and WhatsApp renders
// the site's OG card as the preview (no dropped text/image, unlike the OS share sheet). `icon` = bare
// WhatsApp glyph for header clusters; `pill` = full CTA. WhatsApp green is the one deliberate palette
// exception (a recognisable, conventional action colour) — everything else stays on the design tokens.
import type { MouseEvent } from 'react'
import { openWhatsAppText } from '@/lib/whatsappShare'
import { GPT_FONT, ACCENT } from '@/lib/tokens'
import { useT } from '@/i18n/useT'

const WA_GREEN = ACCENT.whatsapp

function WhatsAppGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24-1.52 0-3.01-.41-4.3-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24zm4.52 9.83c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.48-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31s-.87.85-.87 2.07c0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}

export function WhatsAppButton({
  variant = 'icon',
  size = 22,
  onActivate,
}: {
  variant?: 'icon' | 'pill'
  size?: number
  onActivate?: () => void
}) {
  const t = useT()

  function onClick(e: MouseEvent) {
    e.stopPropagation()
    onActivate?.()
    openWhatsAppText() // shares the message + https://gambiaoutage.com (OG card preview)
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={t.whatsapp.ariaLabel}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: WA_GREEN,
          color: '#fff', borderRadius: 999, padding: '11px 20px', fontFamily: GPT_FONT, fontWeight: 800,
          fontSize: 14.5, cursor: 'pointer', boxShadow: '0 6px 18px rgba(37,211,102,.32)',
        }}
      >
        <WhatsAppGlyph size={19} /> {t.whatsapp.buttonText}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.whatsapp.ariaLabel}
      style={{ border: 'none', background: 'transparent', padding: 5, cursor: 'pointer', color: WA_GREEN, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}
    >
      <WhatsAppGlyph size={size} />
    </button>
  )
}
