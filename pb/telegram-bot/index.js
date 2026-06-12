// index.js — Telegram ingest sidecar. The owner forwards/pastes a link (+ optional photo/caption)
// to the private bot; we store it in `social_links` and it appears in the app's "From Facebook"
// feed within ~a minute. OWNER-ONLY (Telegram-ID allowlist) — every other sender is ignored.
// Long-polling getUpdates → NO inbound port (tunnel-only posture). Mirrors pb/push-worker:
// loopback PB superuser auth, graceful SIGTERM/SIGINT, idle when unconfigured.
//
// A SEPARATE content stream from outage reports: no reporter PII, no rl_key, no account_id.
import 'dotenv/config'
import PocketBase from 'pocketbase'
import { parseIngest, extractOg, isJunkTitle, detectPlatform } from './parse.js'

// Crawler UA: Facebook (and most sites) serve og:image/title/description to this — the same link
// preview Telegram itself shows. Lets a bare link still get an image + text. Best-effort.
const CRAWLER_UA = 'TelegramBot (like TwitterBot)'

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_IDS = '',
  PB_URL = 'http://127.0.0.1:8090',
  PB_ADMIN_EMAIL,
  PB_ADMIN_PASSWORD,
} = process.env
const POLL_TIMEOUT = Number(process.env.TELEGRAM_POLL_TIMEOUT || 30)
const LIVE_MAX_HOURS = Number(process.env.LIVE_MAX_HOURS || 4)
const API = TELEGRAM_BOT_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` : ''
const ADMINS = new Set(TELEGRAM_ADMIN_IDS.split(',').map((s) => s.trim()).filter(Boolean))

async function tg(method, params) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params || {}),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`tg ${method}: ${data.description || res.status}`)
  return data.result
}
async function reply(chatId, text) {
  try { await tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true }) } catch (_) {}
}

async function main() {
  if (!TELEGRAM_BOT_TOKEN || !ADMINS.size) {
    console.log('[telegram-bot] TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_IDS not set — idle.')
    return
  }
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.log('[telegram-bot] PB admin creds not set — idle.')
    return
  }

  const pb = new PocketBase(PB_URL)
  pb.autoCancellation(false)
  async function ensureAuth() {
    if (pb.authStore.isValid) return
    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
  }

  try { const me = await tg('getMe'); console.log(`[telegram-bot] connected as @${me.username}`) }
  catch (e) { console.error('[telegram-bot] getMe failed:', String(e)); process.exit(1) }

  async function fetchPhoto(fileId) {
    const f = await tg('getFile', { file_id: fileId })
    const res = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${f.file_path}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    const name = f.file_path.split('/').pop() || 'photo.jpg'
    const type = name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    return { bytes, name, type }
  }
  // Best-effort: scrape Open Graph tags so a bare link still gets an image + title/description.
  async function fetchOg(url) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': CRAWLER_UA, accept: 'text/html' }, redirect: 'follow' })
      if (!res.ok) return null
      return extractOg((await res.text()).slice(0, 800000))
    } catch (_) { return null }
  }
  async function downloadImage(imgUrl) {
    const res = await fetch(imgUrl, { headers: { 'user-agent': CRAWLER_UA } })
    if (!res.ok) throw new Error('img ' + res.status)
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length < 100 || bytes.length > 5 * 1024 * 1024) throw new Error('img size ' + bytes.length)
    const png = /\.png(\?|$)/i.test(imgUrl)
    return { bytes, name: png ? 'og.png' : 'og.jpg', type: png ? 'image/png' : 'image/jpeg' }
  }
  const cap = (s, n) => String(s || '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)
  async function addLink({ url, title, author, snippet, source, photo, platform, isLive, liveExpiresAt }) {
    await ensureAuth()
    const live = { platform: platform || 'link', is_live: !!isLive, live_expires_at: liveExpiresAt || '' }
    if (photo) {
      const form = new FormData()
      form.append('url', url)
      form.append('title', title)
      form.append('author', author || '')
      form.append('snippet', snippet)
      form.append('source', source)
      form.append('platform', live.platform)
      form.append('is_live', String(live.is_live))
      if (live.live_expires_at) form.append('live_expires_at', live.live_expires_at)
      form.append('pinned', 'false')
      form.append('hidden', 'false')
      form.append('image', new Blob([photo.bytes], { type: photo.type }), photo.name)
      return pb.collection('social_links').create(form)
    }
    return pb.collection('social_links').create({ url, title, author: author || '', snippet, source, pinned: false, hidden: false, ...live })
  }

  async function handle(msg) {
    const chatId = msg.chat && msg.chat.id
    const fromId = msg.from && String(msg.from.id)
    if (!fromId || !ADMINS.has(fromId)) return // owner-only — ignore everyone else silently
    const text = msg.text || msg.caption || ''
    const trimmed = text.trim()

    if (trimmed === '/start' || trimmed === '/help') {
      return reply(chatId,
        'Send me a Facebook (or any) link to publish it in the app.\n' +
        'Caption: first line = title, the rest = description. Attach a photo to use as the card image.\n' +
        'Live stream: /live <url> [caption] → shows a "LIVE now" strip at the top of the app.\n' +
        'Commands: /list · /delete <id> · /pin <id> · /unpin <id> · /live <url> · /endlive <id>')
    }
    if (trimmed.startsWith('/list')) {
      await ensureAuth()
      const rows = await pb.collection('social_links').getList(1, 20, { filter: 'hidden = false', sort: '-pinned,-created' })
      if (!rows.items.length) return reply(chatId, 'No links yet.')
      return reply(chatId, rows.items.map((r) => `${r.pinned ? '📌 ' : ''}#${r.id} — ${r.author || r.title || r.url}`).join('\n'))
    }
    const del = trimmed.match(/^\/delete\s+(\S+)/)
    if (del) {
      await ensureAuth()
      try { await pb.collection('social_links').update(del[1], { hidden: true }); return reply(chatId, `🗑️ Removed #${del[1]}`) }
      catch (_) { return reply(chatId, `Couldn't find #${del[1]}`) }
    }
    const pin = trimmed.match(/^\/(pin|unpin)\s+(\S+)/)
    if (pin) {
      await ensureAuth()
      try { await pb.collection('social_links').update(pin[2], { pinned: pin[1] === 'pin' }); return reply(chatId, `${pin[1] === 'pin' ? '📌 Pinned' : 'Unpinned'} #${pin[2]}`) }
      catch (_) { return reply(chatId, `Couldn't find #${pin[2]}`) }
    }

    const endlive = trimmed.match(/^\/endlive\s+(\S+)/)
    if (endlive) {
      await ensureAuth()
      try { await pb.collection('social_links').update(endlive[1], { is_live: false }); return reply(chatId, `⏹️ Live #${endlive[1]} ended.`) }
      catch (_) { return reply(chatId, `Couldn't find #${endlive[1]}`) }
    }
    const isLive = /^\/live(\s|$)/.test(trimmed)
    const parsed = parseIngest(isLive ? text.replace(/^\s*\/live\s*/, '') : text)
    if (!parsed) return reply(chatId, isLive ? 'Send: /live <stream url> [caption]' : 'Please include a link (https://…) to publish.')
    try {
      await ensureAuth()
      const existing = await pb.collection('social_links').getList(1, 1, { filter: `url = ${JSON.stringify(parsed.url)} && hidden = false` })
      if (existing.items.length) return reply(chatId, `Already added (#${existing.items[0].id}).`)
    } catch (_) {}
    let photo = null
    if (msg.photo && msg.photo.length) {
      try { photo = await fetchPhoto(msg.photo[msg.photo.length - 1].file_id) }
      catch (e) { console.error('[telegram-bot] photo fetch failed', String(e)) }
    }
    // Enrich from the link's Open Graph preview (best-effort). og:title on a Facebook post is the
    // SOURCE page / profile name (e.g. "InsideGambia.com") → store it as `author`, not as the title.
    // The owner's manual caption (if any) stays as `title`; og:description fills the snippet.
    let title = parsed.title, snippet = parsed.snippet, author = ''
    if (!photo || !author || !snippet) {
      const og = await fetchOg(parsed.url)
      if (og) {
        if (!photo && og.image) { try { photo = await downloadImage(og.image) } catch (e) { console.error('[telegram-bot] og image dl failed', String(e)) } }
        if (!isJunkTitle(og.title)) author = cap(og.title, 120)
        if (!snippet && og.description) snippet = cap(og.description, 280)
      }
    }
    try {
      const platform = detectPlatform(parsed.url)
      const liveExpiresAt = isLive ? new Date(Date.now() + LIVE_MAX_HOURS * 3600000).toISOString() : ''
      const rec = await addLink({ url: parsed.url, source: parsed.source, title, author, snippet, photo, platform, isLive, liveExpiresAt })
      return reply(chatId, isLive
        ? `🔴 LIVE now (#${rec.id}) on ${platform}. It shows at the top of the app for up to ${LIVE_MAX_HOURS}h — /endlive ${rec.id} to stop.`
        : `✅ Added (#${rec.id})${photo ? ' with image' : ''}. It will show in the app shortly.`)
    } catch (e) {
      console.error('[telegram-bot] create failed', String(e))
      return reply(chatId, 'Sorry, could not save that. Please try again.')
    }
  }

  let offset = 0
  let stopping = false
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => { if (stopping) process.exit(0); stopping = true; console.log(`[telegram-bot] ${sig} — stopping.`) })
  }
  console.log(`[telegram-bot] polling (timeout=${POLL_TIMEOUT}s)…`)
  while (!stopping) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: POLL_TIMEOUT, allowed_updates: ['message'] })
      for (const u of updates) {
        offset = u.update_id + 1
        if (u.message) { try { await handle(u.message) } catch (e) { console.error('[telegram-bot] handle error', String(e)) } }
      }
    } catch (e) {
      console.error('[telegram-bot] poll error:', String(e))
      try { pb.authStore.clear() } catch (_) {}
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  console.log('[telegram-bot] stopped.')
  process.exit(0)
}

main().catch((e) => { console.error('[telegram-bot] fatal:', e); process.exit(1) })
