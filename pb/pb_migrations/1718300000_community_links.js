/// <reference path="../pb_data/types.d.ts" />
// 1718300000_community_links.js — USER-submitted external links ("From the community" / "Dai
// cittadini"), distinct from the owner-curated `social_links` ("From Facebook"). Anyone can submit a
// Facebook/TikTok link + a required caption + a required cover image; it publishes instantly under the
// device PSEUDONYM (account_id + nickname + avatar_id — same model as posts/comments), and is shown in
// a SEPARATE community section. Auto-moderation only: domain validation + sanitise + per-device cap +
// URL dedupe (in the create hook) + community Report→auto-hide + owner removal.
//
// Anonymity P0: the row carries the public pseudonym but NEVER an rl_key and NEVER any link to the
// anonymous outage `reports`. The Like/Report dedupe rows carry the daily rl_key ONLY (no account_id).
//
// createRule = "" (PUBLIC create, so the client can upload the image via the records API); a create
// hook (go_community_links.pb.js) validates + forces the server-owned fields. All other rules null
// (reads served only via /api/go/community-links).
migrate((app) => {
  const links = new Collection({
    type: 'base',
    name: 'community_links',
    listRule: null, viewRule: null, createRule: '', updateRule: null, deleteRule: null,
    fields: [
      { name: 'account_id', type: 'text', required: true, max: 64 },   // device pseudonym capability id
      { name: 'nickname', type: 'text', required: false, max: 24 },
      { name: 'avatar_id', type: 'text', required: false, max: 40 },
      { name: 'url', type: 'text', required: true, max: 2048 },         // facebook.com / tiktok.com
      { name: 'platform', type: 'text', required: false, max: 20 },     // 'facebook' | 'tiktok'
      { name: 'caption', type: 'text', required: true, max: 200 },
      { name: 'image', type: 'file', required: true, maxSelect: 1, maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
      { name: 'likes', type: 'number', required: false },
      { name: 'report_count', type: 'number', required: false },
      { name: 'hidden', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_community_links_created ON community_links (created)',
      'CREATE INDEX idx_community_links_account ON community_links (account_id)',
      'CREATE INDEX idx_community_links_url ON community_links (url)',
    ],
  })
  app.save(links)

  // anonymous like dedupe — one per device-day per link (daily rl_key, NO account_id)
  const likes = new Collection({
    type: 'base',
    name: 'community_link_likes',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'link', type: 'text', required: true, max: 30 },
      { name: 'rl_key', type: 'text', required: true, max: 64 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_clink_likes_uniq ON community_link_likes (link, rl_key)',
      'CREATE INDEX idx_clink_likes_link ON community_link_likes (link)',
    ],
  })
  app.save(likes)

  // anonymous abuse report dedupe — one per device-day per link (daily rl_key, NO account_id)
  const reports = new Collection({
    type: 'base',
    name: 'community_link_reports',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'link', type: 'text', required: true, max: 30 },
      { name: 'rl_key', type: 'text', required: true, max: 64 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_clink_reports_uniq ON community_link_reports (link, rl_key)',
      'CREATE INDEX idx_clink_reports_link ON community_link_reports (link)',
    ],
  })
  app.save(reports)
}, (app) => {
  app.delete(app.findCollectionByNameOrId('community_link_reports'))
  app.delete(app.findCollectionByNameOrId('community_link_likes'))
  app.delete(app.findCollectionByNameOrId('community_links'))
})
