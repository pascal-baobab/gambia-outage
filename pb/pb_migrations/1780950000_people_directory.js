/// <reference path="../pb_data/types.d.ts" />
// 1780950000_people_directory.js — the opt-in "People / Persone vicine" layer of the Community tab.
//
// Lets neighbours discover each other and send a lightweight "wave" (saluta / interessato) that the
// recipient accepts or declines — the groundwork for future private messaging, WITHOUT any messaging
// in v1. Everything is keyed on the device PSEUDONYM (account_id capability) exactly like posts /
// comments / community_links.
//
// Anonymity P0 (unchanged): these rows carry account_id pseudonyms ONLY. They NEVER carry an rl_key
// and are NEVER linked to the anonymous outage `reports`. account_id stays a server-only secret — the
// People read-model addresses other users by their PROFILE RECORD ID, never by their account_id, so a
// wave can be sent without ever exposing anyone's capability id.
//
// • profiles gains two privacy switches: `discoverable` (appear in the People list — DEFAULT OFF,
//   strict opt-in) and `accept_requests` (receive waves — DEFAULT ON, but you only get waves once
//   you've made yourself discoverable).
// • connections — one row per (from→to) wave: status pending|accepted|declined.
// • blocks — one row per (blocker→blocked): hides you from them both ways and bars new waves.
//
// All three are server-only (every rule null): reads/writes go exclusively through the /api/go/people
// routes (global $app bypasses collection rules), so the directory can never be enumerated raw.
migrate(
  (app) => {
    // ── profiles: privacy switches ──────────────────────────────────────────
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.add(new Field({ name: 'discoverable', type: 'bool' }))     // default false → opt-in
    profiles.fields.add(new Field({ name: 'accept_requests', type: 'bool' }))  // semantic default ON, set on first save
    app.save(profiles)

    // ── connections: a directed "wave" + its accept/decline status ──────────
    const connections = new Collection({
      type: 'base',
      name: 'connections',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'from_account', type: 'text', required: true, max: 64 }, // sender pseudonym capability
        { name: 'to_account', type: 'text', required: true, max: 64 },   // recipient pseudonym capability
        { name: 'kind', type: 'text', required: false, max: 16 },        // 'wave' (future: more intents)
        { name: 'status', type: 'text', required: false, max: 16 },      // pending | accepted | declined
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_connections_pair ON connections (from_account, to_account)',
        'CREATE INDEX idx_connections_to ON connections (to_account, status)',
        'CREATE INDEX idx_connections_from ON connections (from_account)',
      ],
    })
    app.save(connections)

    // ── blocks: a directed mute (hide + bar waves), both directions enforced in the read-model ──
    const blocks = new Collection({
      type: 'base',
      name: 'blocks',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'blocker_account', type: 'text', required: true, max: 64 },
        { name: 'blocked_account', type: 'text', required: true, max: 64 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_blocks_pair ON blocks (blocker_account, blocked_account)',
        'CREATE INDEX idx_blocks_blocker ON blocks (blocker_account)',
        'CREATE INDEX idx_blocks_blocked ON blocks (blocked_account)',
      ],
    })
    app.save(blocks)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('blocks'))
    app.delete(app.findCollectionByNameOrId('connections'))
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.removeByName('discoverable')
    profiles.fields.removeByName('accept_requests')
    app.save(profiles)
  },
)
