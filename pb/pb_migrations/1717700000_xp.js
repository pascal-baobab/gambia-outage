/// <reference path="../pb_data/types.d.ts" />
// 1717700000_xp.js — gamification storage.
//   xp_grants: server-minted UNCLAIMED credits. Keyed by sha256(claim_nonce). Carries NO reference
//     to the report that earned it (no report id / client_uuid / rl_key) — this is what keeps the
//     XP ledger decoupled from the anonymous report stream (P0 anti-deanonimisation).
//   xp_ledger: per-account claimed credits. Reads NON-PUBLIC (hook/admin only), like `reports`.
migrate((app) => {
  const grants = new Collection({
    type: 'base',
    name: 'xp_grants',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'nonce_hash', type: 'text', required: true, max: 64 },
      { name: 'xp', type: 'number', required: true },
      { name: 'kind', type: 'text', required: true, max: 16 },
      { name: 'badge', type: 'text', required: false, max: 32 },
      { name: 'week_id', type: 'text', required: true, max: 8 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_xp_grants_nonce ON xp_grants (nonce_hash)'],
  })
  app.save(grants)

  const ledger = new Collection({
    type: 'base',
    name: 'xp_ledger',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'account_id', type: 'text', required: true, max: 64 },
      { name: 'nonce_hash', type: 'text', required: true, max: 64 },
      { name: 'xp', type: 'number', required: true },
      { name: 'kind', type: 'text', required: true, max: 16 },
      { name: 'badge', type: 'text', required: false, max: 32 },
      { name: 'week_id', type: 'text', required: true, max: 8 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_xp_ledger_nonce ON xp_ledger (nonce_hash)',
      'CREATE INDEX idx_xp_ledger_account ON xp_ledger (account_id)',
    ],
  })
  app.save(ledger)
}, (app) => {
  app.delete(app.findCollectionByNameOrId('xp_ledger'))
  app.delete(app.findCollectionByNameOrId('xp_grants'))
})
