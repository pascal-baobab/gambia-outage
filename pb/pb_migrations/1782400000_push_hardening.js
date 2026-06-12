/// <reference path="../pb_data/types.d.ts" />
// 1782400000_push_hardening.js — anonymous Web Push hardening (audit 2026-06-12).
//  subscriptions: UNIQUE (endpoint) → UNIQUE (endpoint, zone). One device may hold alert bells on
//    several zones; the old endpoint-only upsert silently MOVED the subscription (enabling zone B
//    killed zone A while the UI kept showing both bells on).
//  sub_rl: per-IP subscribe rate-limit ledger. Rows carry ONLY ip_key + created — no endpoint, no
//    zone — so nothing here can correlate a push device with the anonymous report stream
//    (CLAUDE.md invariant #1). ip_key rotates daily; rows are pruned in the subscribe handler.
migrate(
  (app) => {
    const subs = app.findCollectionByNameOrId('subscriptions')
    subs.indexes = ['CREATE UNIQUE INDEX idx_subs_endpoint_zone ON subscriptions (endpoint, zone)']
    app.save(subs)

    const subRl = new Collection({
      type: 'base',
      name: 'sub_rl',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'ip_key', type: 'text', required: true, max: 64 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_sub_rl_ip_created ON sub_rl (ip_key, created)'],
    })
    app.save(subRl)
  },
  (app) => {
    // Down: best-effort — restoring UNIQUE (endpoint) fails if multi-zone rows exist; dedupe first.
    const subs = app.findCollectionByNameOrId('subscriptions')
    subs.indexes = ['CREATE UNIQUE INDEX idx_subs_endpoint ON subscriptions (endpoint)']
    app.save(subs)
    app.delete(app.findCollectionByNameOrId('sub_rl'))
  },
)
