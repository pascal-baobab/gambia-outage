/// <reference path="../pb_data/types.d.ts" />
// 1782200000_reports_ip_key.js — P0 Sybil hardening (2026-06-07 security audit).
//
// rl_key = sha256(IP + UA[:40] + DAILY_SALT) and the UA is ATTACKER-CONTROLLED: from a single IP,
// rotating the User-Agent header mints unlimited "distinct reporters", bypassing the hourly cap,
// the confirm threshold and the back-close floor. ip_key = sha256('ip:' + IP + DAILY_SALT) — same
// daily rotation, same anonymity class as rl_key, stored ONLY on the non-public `reports` rows —
// re-anchors every trust count to the network layer (see lib/go.js distinctReporters60m /
// rateLimitReason / mergeBack). Never stored on social/XP/profile rows (invariant #1 intact).
migrate(
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')
    // hidden: true — same class as rl_key. Server-set only (r.set in the hook), never read from the
    // request body and never returned by any API (defense-in-depth even though reports reads are
    // already admin/hook-only via 1717400000_p0_reports_privacy.js). Keeps the hashed-IP identifier
    // out of every read-model so the P0 anonymity invariant holds if read rules ever change.
    reports.fields.add(new Field({ name: 'ip_key', type: 'text', max: 64, hidden: true }))
    app.save(reports)
  },
  (app) => {
    const reports = app.findCollectionByNameOrId('reports')
    reports.fields.removeByName('ip_key')
    app.save(reports)
  },
)
