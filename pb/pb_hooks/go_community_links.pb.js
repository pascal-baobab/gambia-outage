/// <reference path="../pb_data/types.d.ts" />
// go_community_links.pb.js — USER-submitted external links ("From the community" / "Dai cittadini").
// Distinct from the owner-curated `social_links`. Public create (records API, multipart so the cover
// image uploads) is intercepted here to validate + force the server-owned fields; reads/like/report
// are served via /api/go/community-links. Attributed to the device pseudonym; NEVER an rl_key on the
// row, NEVER any link to the anonymous outage reports.
//
// ⚠ PB JSVM: handlers can't see file scope — require lib/go.js INSIDE each handler; use global $app.

// Validate + sanitise + force the server-owned fields on the public create. Image-required and
// caption-required are also enforced by the collection schema; this adds friendly messages + the
// domain/cap/dedupe rules the schema can't express.
onRecordCreateRequest((e) => {
  const go = require(`${__hooks}/lib/go.js`)
  const r = e.record

  const account = String(r.get('account_id') || '')
  if (!go.ACCT_RE.test(account)) throw new BadRequestError('bad request')

  const url = String(r.get('url') || '').trim()
  const platform = go.communityLinkPlatform(url)
  if (!platform) throw new BadRequestError('Only Facebook or TikTok links are accepted.')

  const caption = go.sanitiseText(r.get('caption'), go.CFG.COMMUNITY_LINK_CAPTION_MAX)
  if (!caption) throw new BadRequestError('A caption is required.')

  if (!r.get('image')) throw new BadRequestError('A cover image is required.')

  // per-device hourly cap
  const blocked = go.socialRateLimited(e.app, 'community_links', account, go.CFG.COMMUNITY_LINK_HOURLY)
  if (blocked) throw new BadRequestError(blocked)

  // dedupe by URL (a link already on the wall, still visible)
  const dup = e.app.findRecordsByFilter('community_links', 'url = {:u} && hidden = false', '', 1, 0, { u: url })
  if (dup.length) throw new BadRequestError('This link has already been shared.')

  // force the server-owned fields (never trust the client for these)
  r.set('url', url)
  r.set('platform', platform)
  r.set('caption', caption)
  r.set('nickname', go.cleanNick(r.get('nickname')))
  r.set('avatar_id', go.cleanAvatar(r.get('avatar_id')))
  r.set('likes', 0)
  r.set('report_count', 0)
  r.set('hidden', false)

  e.next()
}, 'community_links')

// GET /api/go/community-links?limit= → { links:[...] } (non-hidden, newest-first), ~edge cached.
routerAdd('GET', '/api/go/community-links', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    let limit = ''
    try { limit = (e.requestInfo().query && e.requestInfo().query.limit) || '' } catch (_) {}
    return e.json(200, go.buildCommunityLinks($app, limit))
  } catch (err) {
    $app.logger().error('community-links route failed', 'err', String(err))
    return e.json(500, { message: 'internal error' })
  }
})

// POST /api/go/community-links/like {id} — one anonymous like per device-day. Idempotent.
routerAdd('POST', '/api/go/community-links/like', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const id = (((info && info.body) || {}).id || '').toString()
    if (!id) return e.json(400, { message: 'id required' })
    let realIP = 'dev-local'; try { realIP = e.realIP() || realIP } catch (_) {}
    let ua = ''; try { ua = (info.headers && (info.headers.user_agent || info.headers['user-agent'])) || '' } catch (_) {}
    return e.json(200, go.likeCommunityLink($app, id, realIP, ua))
  } catch (err) {
    const msg = String(err)
    if (msg.indexOf('not found') >= 0) return e.json(404, { message: 'not found' })
    $app.logger().error('community-link like failed', 'err', msg)
    return e.json(500, { message: 'internal error' })
  }
})

// POST /api/go/community-links/report {id} — one anonymous abuse report per device-day; auto-hides
// the card at the distinct-reporter floor. Idempotent.
routerAdd('POST', '/api/go/community-links/report', (e) => {
  try {
    const go = require(`${__hooks}/lib/go.js`)
    const info = e.requestInfo()
    const id = (((info && info.body) || {}).id || '').toString()
    if (!id) return e.json(400, { message: 'id required' })
    let realIP = 'dev-local'; try { realIP = e.realIP() || realIP } catch (_) {}
    let ua = ''; try { ua = (info.headers && (info.headers.user_agent || info.headers['user-agent'])) || '' } catch (_) {}
    return e.json(200, go.reportCommunityLink($app, id, realIP, ua))
  } catch (err) {
    const msg = String(err)
    if (msg.indexOf('not found') >= 0) return e.json(404, { message: 'not found' })
    $app.logger().error('community-link report failed', 'err', msg)
    return e.json(500, { message: 'internal error' })
  }
})
