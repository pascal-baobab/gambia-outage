// parse.js — pure helpers for the Telegram ingest bot (exported for unit testing). No I/O.
// Turns an owner's message into a social_links payload: first non-URL line -> title, the rest ->
// snippet, host -> source. Returns null when the message carries no link.

const URL_RE = /(https?:\/\/[^\s<>"')]+)/i
const FB_HOST_RE = /(^|\.)(facebook\.com|fb\.me|fb\.watch|m\.facebook\.com)$/i

export function detectSource(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return FB_HOST_RE.test(host) ? 'facebook' : 'link'
  } catch (_) {
    return 'link'
  }
}

// Finer-grained than detectSource: which platform a (live) link belongs to → picks the embed
// treatment in the LIVE strip. Falls back to 'link' for anything we don't embed.
export function detectPlatform(url) {
  let host = ''
  try { host = new URL(url).hostname.toLowerCase() } catch (_) { return 'link' }
  if (/(^|\.)(facebook\.com|fb\.me|fb\.watch|m\.facebook\.com)$/.test(host)) return 'facebook'
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok'
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram'
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube'
  return 'link'
}

function clean(s, max) {
  return String(s || '')
    .replace(/[\x00-\x1f\x7f]/g, ' ') // strip control chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

// ── Open Graph extraction (best-effort link enrichment) ─────────────────────────────────────────
// Facebook serves og:image/og:title/og:description to crawler user-agents (the same preview Telegram
// shows). We scrape those so a bare link still gets an image + text. Falls back gracefully to ''.
function decodeEntities(s) {
  return String(s)
    // numeric entities first (hex &#x1f923; → 🤣, decimal &#8220; → “) — covers emoji, smart
    // quotes, dashes etc. that Facebook's og:description ships encoded.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
}
function codePoint(n) {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return ''
  try { return String.fromCodePoint(n) } catch (_) { return '' }
}
function metaContent(html, prop) {
  // match a <meta …> tag carrying property/name === prop, then pull its content="" (attr order-agnostic)
  const re = new RegExp(`<meta[^>]*(?:property|name)=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i')
  const tag = html.match(re)
  if (!tag) return ''
  const c = tag[0].match(/content=["']([^"']*)["']/i)
  return c ? decodeEntities(c[1]).trim() : ''
}
export function extractOg(html) {
  const h = String(html || '')
  return {
    image: metaContent(h, 'og:image'),
    title: metaContent(h, 'og:title'),
    description: metaContent(h, 'og:description'),
  }
}
// FB login-wall / generic titles we should NOT use as a card title.
export function isJunkTitle(s) {
  return !s || /^(facebook|log in|you must log in|see posts)/i.test(s.trim())
}

export function parseIngest(text) {
  const raw = String(text || '')
  const m = raw.match(URL_RE)
  if (!m) return null
  let url = m[1].replace(/[.,)\]]+$/, '') // trim trailing punctuation
  if (url.length > 2048) url = url.slice(0, 2048)
  const caption = raw.replace(m[1], ' ')
  const lines = caption.split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    url,
    title: clean(lines[0] || '', 120),
    snippet: clean(lines.slice(1).join(' '), 280),
    source: detectSource(url),
  }
}
