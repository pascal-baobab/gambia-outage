/// <reference path="../pb_data/types.d.ts" />
// 1782300000_moderator.js — moderator capability + audit trail.
//  profiles.is_moderator (bool): flipped by the owner in /_/ (found by nickname) to grant a pseudonym
//    the in-app HARD-delete power. Mirrors the is_ambassador pattern.
//  mod_log: append-only audit of moderator actions. Stores the MODERATOR's own account in mod_account
//    (an action trail inside the pseudonym layer) — it carries NO device dedupe key and is never linked
//    to the anonymous outage stream. Server-only (all rules null); inspectable in /_/.
migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.add(new BoolField({ name: 'is_moderator', required: false }))
    app.save(profiles)

    const modLog = new Collection({
      type: 'base',
      name: 'mod_log',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'mod_account',  type: 'text',   required: true,  max: 64 },
        { name: 'mod_nickname', type: 'text',   required: false, max: 60 },
        { name: 'action',       type: 'text',   required: true,  max: 24 },
        { name: 'target_type',  type: 'text',   required: true,  max: 24 },
        { name: 'target_id',    type: 'text',   required: true,  max: 64 },
        { name: 'cascaded',     type: 'number', required: false },
        { name: 'created',      type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_mod_log_account_created ON mod_log (mod_account, created)'],
    })
    app.save(modLog)
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.removeByName('is_moderator')
    app.save(profiles)
    app.delete(app.findCollectionByNameOrId('mod_log'))
  },
)
