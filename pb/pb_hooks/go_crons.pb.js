/// <reference path="../pb_data/types.d.ts" />
// go_crons.pb.js — Phase 1 background jobs (§4.4/§4.6). Server TZ = Africa/Banjul (UTC+0).
// Each handler require()s lib/go.js inside itself (PB JSVM isolation).

// Sliding-window decay + auto-close, every 5 minutes. Recomputes confidence for every
// open event (out→partial→on as confirmations age out of the 60-min window), closes
// idle/over-long events, then rewrites all read-models so the public API reflects decay.
cronAdd('go_decay', '*/5 * * * *', () => {
  const go = require(`${__hooks}/lib/go.js`)
  const refreshed = go.decayRefresh($app)
  const closed = go.autoCloseStale($app)
  // M4 perf: with zero open events and zero just-closed ones, nothing time-varying feeds the
  // read-models — skip the full O(zones) rewrite (it ran every 5 min regardless). Quiet nights cost
  // nothing; report writes recompute their own zone inline, and go_daily still does a full refresh.
  if (refreshed > 0 || closed > 0) {
    go.recomputeAll($app)
    go.recomputeCommunity($app) // Phase 5: rewrite the live current-week community board
  }
  go.opsHeartbeat($app) // M1 ops: stamp liveness — /api/go/ops/health alerts if this stops running
  $app.logger().info('cron go_decay', 'openRefreshed', refreshed, 'autoClosed', closed)
})

// Phase 5 — weekly rollover: Mon 00:01 Africa/Banjul freezes the just-closed week into
// weekly_honors (idempotent; never overwrites the illustrative seed). Computes rank_dark/voice.
cronAdd('go_weekly', '1 0 * * 1', () => {
  const go = require(`${__hooks}/lib/go.js`)
  const lastWeek = go.prevWeekId(go.isoWeekId(new Date()))
  const n = go.freezeWeek($app, lastWeek)
  go.recomputeCommunity($app)
  $app.logger().info('cron go_weekly', 'frozenWeek', lastWeek, 'rows', n)
})

// Daily salt rotation at 00:05 Banjul — rotates rl_key salt and refreshes read-models
// (new UTC day resets the todayMin / week windows).
cronAdd('go_daily', '5 0 * * *', () => {
  const go = require(`${__hooks}/lib/go.js`)
  go.rotateSalt($app)
  go.recomputeAll($app)
  $app.logger().info('cron go_daily', 'saltRotated', true)
})

// Anti-squatting name GC at 00:20 Banjul — frees claimed unique names whose owner account is fully
// inactive (no password, no XP, no social/People footprint) for >= NAME_INACTIVE_DAYS. Set
// NAME_INACTIVE_DAYS=0 in /root/.env to disable. See go.releaseInactiveNames().
cronAdd('go_name_gc', '20 0 * * *', () => {
  const go = require(`${__hooks}/lib/go.js`)
  const released = go.releaseInactiveNames($app)
  $app.logger().info('cron go_name_gc', 'namesReleased', released)
})
