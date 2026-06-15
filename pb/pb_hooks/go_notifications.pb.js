/// <reference path="../pb_data/types.d.ts" />
// go_notifications.pb.js — v2.0 stub: notifications read endpoint (NOTIF-08).
// GET /api/go/notifications → { items: [], cursor: null }
// Returns a constant empty payload — no DB reads, no user data, nothing to disclose.
// Real read-state (per-device, privacy-preserving) arrives in v2.1.
// No rate-limit middleware: this GET is a constant-empty stub; rate-limit is D-13 scope
// for the real v2.1 implementation. Body-cap (go_guard.pb.js) applies to POST only — GET exempt.
// No rl_key / account_id linkage (P0 anonymity, CLAUDE.md Core invariants #1/#4).
// NB (PB JSVM isolation): no file-scope vars; no require() at file scope.
routerAdd('GET', '/api/go/notifications', (e) => {
  return e.json(200, { items: [], cursor: null })
})
