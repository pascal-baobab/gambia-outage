/// <reference path="../pb_data/types.d.ts" />
// 1717900000_social_links.js — owner-curated external posts (e.g. Facebook announcements) ingested
// via the Telegram bot sidecar and shown as lightweight link-out cards in the app ("From Facebook").
// Non-public reads (served only via /api/go/social). Written ONLY by the bot authenticated as a PB
// superuser over loopback. A SEPARATE content stream from reports — no reporter PII, no rl_key,
// no account_id; reporter anonymity is unaffected.
migrate((app) => {
  const social = new Collection({
    type: 'base',
    name: 'social_links',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'url', type: 'text', required: true, max: 2048 },
      { name: 'title', type: 'text', required: false, max: 120 },
      { name: 'snippet', type: 'text', required: false, max: 280 },
      { name: 'image', type: 'file', required: false, maxSelect: 1, maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
      { name: 'source', type: 'text', required: false, max: 20 },
      { name: 'pinned', type: 'bool' },
      { name: 'hidden', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_social_created ON social_links (created)'],
  })
  app.save(social)
}, (app) => {
  app.delete(app.findCollectionByNameOrId('social_links'))
})
