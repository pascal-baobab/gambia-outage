/// <reference path="../pb_data/types.d.ts" />
// 1782500000_leaderboard.js — per-zone Photo-Crush leaderboard (Phase 6 / LEAD-01).
//  leaderboard_scores: the pseudonym row (mirrors `posts`). Content is attributed to the device
//    pseudonym (nickname + avatar_id) and is NEVER linked to the anonymous reports stream.
//    P0 invariant #4 — this row MUST NOT carry report_id / event_id / rl_key / ip_key
//    (REQUIREMENTS.md line 80). community-anonymity.test.ts source-scans this block and fails the
//    build if any of those identifiers appear here. One row per (account_id, zone, week);
//    best-per-week upsert bumps `updated`. All reads served only via /api/go/* (every rule null).
//  lb_rl: per-IP submit rate-limit ledger (verbatim shape of the sub_rl push-hardening ledger).
//    Rows carry ONLY ip_key + created — no account_id, no zone, no score — so nothing here can
//    correlate a leaderboard pseudonym with the anonymous report stream (CLAUDE.md invariant #1).
//    ip_key rotates daily; rows are pruned in the submit handler.
migrate(
  (app) => {
    const ZONES_ID = app.findCollectionByNameOrId('zones').id

    const scores = new Collection({
      type: 'base',
      name: 'leaderboard_scores',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'account_id', type: 'text', required: true, max: 64 },
        { name: 'nickname', type: 'text', required: false, max: 24 },
        { name: 'avatar_id', type: 'text', required: false, max: 40 },
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'score', type: 'number', required: true },
        { name: 'week', type: 'text', required: true, max: 8 },
        { name: 'hidden', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lb_acct_zone_week ON leaderboard_scores (account_id, zone, week)',
        'CREATE INDEX idx_lb_zone_week_score ON leaderboard_scores (zone, week, score)',
      ],
    })
    app.save(scores)

    const lbRl = new Collection({
      type: 'base',
      name: 'lb_rl',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'ip_key', type: 'text', required: true, max: 64 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_lb_rl_ip_created ON lb_rl (ip_key, created)'],
    })
    app.save(lbRl)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('lb_rl'))
    app.delete(app.findCollectionByNameOrId('leaderboard_scores'))
  },
)
