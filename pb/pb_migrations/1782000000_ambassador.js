/// <reference path="../pb_data/types.d.ts" />
// 1782000000_ambassador.js — ambassador_invites collection + ambassador fields on profiles.
// ambassador_invites: time-limited multi-use invite tokens. No rl_key, no account linkage.
// profiles: is_ambassador (bool) + ambassador_since (date) for the public Wall of Fame.
migrate(
  (app) => {
    // New collection: ambassador_invites
    const invites = new Collection({
      type: 'base',
      name: 'ambassador_invites',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'token',           type: 'text',   required: true, max: 64 },
        { name: 'label',           type: 'text',   required: false, max: 120 },
        { name: 'expires_at',      type: 'date',   required: true },
        { name: 'max_uses',        type: 'number', required: true },
        { name: 'activated_count', type: 'number', required: false },
        { name: 'created',         type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ambassador_invites_token ON ambassador_invites (token)'],
    })
    app.save(invites)

    // Add ambassador fields to existing profiles collection
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.add(new BoolField({ name: 'is_ambassador', required: false }))
    profiles.fields.add(new DateField({ name: 'ambassador_since', required: false }))
    app.save(profiles)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('ambassador_invites'))
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.removeByName('is_ambassador')
    profiles.fields.removeByName('ambassador_since')
    app.save(profiles)
  },
)
