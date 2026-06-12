// whatsappShare.ts — one-tap WhatsApp share with a "photo capture". WhatsApp is how things spread in
// The Gambia, so the share is available app-wide (see components/shared/WhatsAppButton).
//
// "Photo capture": the app already renders a national outage share-card to a PNG (lib/shareCard). We
// pre-build that blob ahead of the tap and hand it to the Web Share API → the OS sheet lets the user
// pick WhatsApp and sends IMAGE + text + URL. When file-share is unavailable (desktop, locked-down
// WebViews) we fall back to wa.me with the text + URL — WhatsApp then renders our OG card as the
// preview, so the link still travels with an image.
//
// iOS pitfall: navigator.share({files}) must run synchronously inside the tap gesture. shareImage()
// calls it before its first await, and callers invoke shareToWhatsApp() directly in onClick with an
// ALREADY-built blob — so the gesture is honoured. Never await blob creation inside the handler.
import { shareImage } from './share'

const SITE_URL = 'https://gambiaoutage.com'

// Neutral, evidence-based copy (no slogan-bashing) + the URL so the link carries a preview everywhere.
export const WA_SHARE_TEXT = `See where the power is out across The Gambia — live, anonymous, community-reported. ${SITE_URL}`

/** Open WhatsApp with the share text + URL (no image). Works on mobile app + WhatsApp Web. */
export function openWhatsAppText(text: string = WA_SHARE_TEXT): void {
  try {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  } catch {
    /* popup blocked — non-blocking */
  }
}

/**
 * Share to WhatsApp. With a pre-built card blob → native share sheet (image + text + URL). Without one
 * (or if the device can't file-share) → opens WhatsApp with the URL. MUST be called synchronously from
 * a tap handler with the blob already built.
 */
export async function shareToWhatsApp(blob?: Blob | null): Promise<void> {
  if (blob) {
    const res = await shareImage(blob, 'gambia-outage.png', WA_SHARE_TEXT)
    if (res === 'shared' || res === 'cancelled') return // user reached the share sheet
  }
  openWhatsAppText()
}
