/// <reference path="../pb_data/types.d.ts" />
// 1718000000_social_likes.js — "like" interaction on owner-curated external posts ("From Facebook").
// Adds a denormalised `likes` counter to social_links + a `social_likes` dedupe collection.
// Dedupe is by the daily-rotating rl_key (one like per device-day per post; rl_key rotates → not a
// permanent lock, consistent with the report stream's anonymity floor). NO account_id on the like,
// NO link to the device's reports or profile. Reads NON-PUBLIC (served only via /api/go/social).
migrate((app) => {
  const social = app.findCollectionByNameOrId('social_links')
  social.fields.add(new NumberField({ name: 'likes', required: false }))
  app.save(social)

  const likes = new Collection({
    type: 'base',
    name: 'social_likes',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'link', type: 'text', required: true, max: 30 },   // social_links id
      { name: 'rl_key', type: 'text', required: true, max: 64 },  // daily-rotating, hidden, dedupe-only
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_social_likes_uniq ON social_likes (link, rl_key)',
      'CREATE INDEX idx_social_likes_link ON social_likes (link)',
    ],
  })
  app.save(likes)
}, (app) => {
  app.delete(app.findCollectionByNameOrId('social_likes'))
  const social = app.findCollectionByNameOrId('social_links')
  social.fields.removeByName('likes')
  app.save(social)
})
