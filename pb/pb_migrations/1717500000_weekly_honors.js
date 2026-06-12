/// <reference path="../pb_data/types.d.ts" />
// weekly_honors — Phase 5 (Community / Wall of Honor). One row per (ISO week, quarter).
// Written by the weekly rollover cron (freezeWeek) and by data/seed-honor.ts (illustrative
// 2026-W22 history). PUBLIC read (boards are public); create/update superuser-only (machine-
// written; the public API serves them via /api/go/community*, never via the collection list).
// Unique (week_id, zone) → idempotent seed + idempotent rollover.
migrate(
  (app) => {
    const PUBLIC = ''
    const ADMIN = null
    const ZONES_ID = 'zones1234567890'

    const wh = new Collection({
      type: 'base',
      name: 'weekly_honors',
      listRule: PUBLIC,
      viewRule: PUBLIC,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'week_id', type: 'text', required: true, max: 10 }, // ISO week YYYY-Www
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'region', type: 'text', required: false, max: 200 }, // display_region snapshot (cheap board reads)
        { name: 'dark_minutes', type: 'number', required: false }, // confirmed-outage minutes that week
        { name: 'distinct_reporters', type: 'number', required: false },
        { name: 'confirms', type: 'number', required: false },
        { name: 'watch_days', type: 'number', required: false }, // days with ≥1 report (0–7)
        { name: 'rank_dark', type: 'number', required: false }, // 1 = worst-hit
        { name: 'rank_voice', type: 'number', required: false }, // 1 = most participation
        { name: 'illustrative', type: 'bool' }, // true ⇒ seed/historical estimate → render the label
        { name: 'source', type: 'select', required: false, maxSelect: 1, values: ['seed', 'live'] },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_wh_week_zone ON weekly_honors (week_id, zone)',
        'CREATE INDEX idx_wh_week ON weekly_honors (week_id)',
      ],
    })
    app.save(wh)
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId('weekly_honors')) } catch (_) {}
  },
)
