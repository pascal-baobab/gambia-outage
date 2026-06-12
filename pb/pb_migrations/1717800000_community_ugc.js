/// <reference path="../pb_data/types.d.ts" />
// 1717800000_community_ugc.js — community UGC: persistent-pseudonym social layer.
// profiles (self-intro), posts (Outage stories), comments (per-zone discussion).
// ALL non-public reads (served only via /api/go/* routes) — no enumeration of account_ids,
// consistent with the P0 anonymity posture. Content is attributed to the device pseudonym
// (nickname + avatar_id) and is NEVER linked to the anonymous reports stream.
migrate((app) => {
  const ZONES_ID = app.findCollectionByNameOrId('zones').id

  const profiles = new Collection({
    type: 'base',
    name: 'profiles',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'account_id', type: 'text', required: true, max: 64 },
      { name: 'nickname', type: 'text', required: false, max: 24 },
      { name: 'avatar_id', type: 'text', required: false, max: 40 },
      { name: 'bio', type: 'text', required: false, max: 160 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_profiles_account ON profiles (account_id)'],
  })
  app.save(profiles)

  const posts = new Collection({
    type: 'base',
    name: 'posts',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'account_id', type: 'text', required: true, max: 64 },
      { name: 'nickname', type: 'text', required: false, max: 24 },
      { name: 'avatar_id', type: 'text', required: false, max: 40 },
      { name: 'zone', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
      { name: 'body', type: 'text', required: true, max: 280 },
      { name: 'hidden', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE INDEX idx_posts_created ON posts (created)',
      'CREATE INDEX idx_posts_account ON posts (account_id)',
    ],
  })
  app.save(posts)

  const comments = new Collection({
    type: 'base',
    name: 'comments',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'account_id', type: 'text', required: true, max: 64 },
      { name: 'nickname', type: 'text', required: false, max: 24 },
      { name: 'avatar_id', type: 'text', required: false, max: 40 },
      { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
      { name: 'body', type: 'text', required: true, max: 240 },
      { name: 'hidden', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE INDEX idx_comments_zone ON comments (zone)',
      'CREATE INDEX idx_comments_account ON comments (account_id)',
    ],
  })
  app.save(comments)
}, (app) => {
  app.delete(app.findCollectionByNameOrId('comments'))
  app.delete(app.findCollectionByNameOrId('posts'))
  app.delete(app.findCollectionByNameOrId('profiles'))
})
