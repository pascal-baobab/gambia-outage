// channelLogos.ts — SAME-ORIGIN cached logos for monitored FB PAGES. Fetched once via
// `tooling/fb-monitor/fetch-logos.js` into web/public/social/<slug>.jpg, so the From-Facebook cards
// show the real page logo WITHOUT ever calling facebook.com at render (keeps the privacy/2G rule:
// nothing loads from FB until the user taps through). Keyed by the lowercase PAGE slug — the FIRST
// path segment after facebook.com (NOT the trailing post id). Groups / unknown pages → no entry →
// the card falls back to the deterministic monogram.
const LOGOS: Record<string, string> = {
  whatsongambia: '/social/whatsongambia.jpg',
  fatunetwork: '/social/fatunetwork.jpg',
  nationalwaterandelectricitycompany: '/social/nationalwaterandelectricitycompany.jpg',
  nawecgambia: '/social/nationalwaterandelectricitycompany.jpg', // NAWEC 2nd handle → shares the logo
  gambiaoutage: '/social/gambiaoutage.jpg',
  '440025071060305': '/social/gambianews.jpg', // Gambia News group (keyed by group id)
}

/** Resolve a page/group logo from a Facebook POST url, or null (→ monogram). For a group url
 *  (.../groups/<id>/...) the key is the group id; for a page it's the first path segment. */
export function logoForUrl(url: string): string | null {
  const m = (url || '').match(/facebook\.com\/(?:groups\/)?([^/?#]+)/i)
  if (!m) return null
  return LOGOS[m[1].toLowerCase()] || null
}
