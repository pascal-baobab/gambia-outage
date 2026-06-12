/// <reference path="../pb_data/types.d.ts" />
// Init collections — Gambia Outage (prompt-claude-code.md §4.1 + §4.9).
// Pocketbase v0.39 migration API: new Collection({ fields }) + app.save().
// Public reads ("") on zones/events/zone_daily_stats/read_models; writes are hook/admin (null).
// `zones.id` is a stable slug (banjul, banjul-0); other collections use auto ids.
// Fixed collection ids on zones/events let relations reference them at create time
// (incl. the zones self-relation `parent`).
migrate(
  (app) => {
    const PUBLIC = '' // anyone
    const ADMIN = null // superusers / hooks only
    const ZONES_ID = 'zones1234567890'
    const EVENTS_ID = 'events123456789'

    const slugId = () => ({
      name: 'id',
      type: 'text',
      system: true,
      primaryKey: true,
      required: true,
      min: 1,
      max: 50,
      pattern: '^[a-z0-9][a-z0-9-]*$',
      autogeneratePattern: '', // must be supplied (by seed) — no auto-generation
    })
    const created = () => ({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false })
    const updated = () => ({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true })

    // ── zones (the area tree; slug PK; self-relation parent) ────────────────
    const zones = new Collection({
      id: ZONES_ID,
      type: 'base',
      name: 'zones',
      listRule: PUBLIC,
      viewRule: PUBLIC,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        slugId(),
        { name: 'level', type: 'select', required: true, maxSelect: 1, values: ['region', 'district', 'settlement'] },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'display_region', type: 'text', max: 200 },
        { name: 'lat', type: 'number', required: false },
        { name: 'lng', type: 'number', required: false },
        { name: 'bbox', type: 'json', maxSize: 200000 },
        { name: 'geojson', type: 'json', maxSize: 5000000 },
        { name: 'seed_pop', type: 'number', required: false },
        created(),
        updated(),
      ],
      indexes: ['CREATE INDEX idx_zones_level ON zones (level)'],
    })
    app.save(zones)

    // self-relation `parent` — added in a 2nd pass once `zones` exists (can't ref itself at create)
    {
      const z = app.findCollectionByNameOrId(ZONES_ID)
      z.fields.add(
        new Field({ name: 'parent', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID }),
      )
      z.indexes = z.indexes.concat(['CREATE INDEX idx_zones_parent ON zones (parent)'])
      app.save(z)
    }

    // ── events (one open outage per zone — merge target) ────────────────────
    const events = new Collection({
      id: EVENTS_ID,
      type: 'base',
      name: 'events',
      listRule: PUBLIC,
      viewRule: PUBLIC,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['open', 'closed'] },
        { name: 'started_at', type: 'date', required: false },
        { name: 'ended_at', type: 'date', required: false },
        { name: 'out_confirmations', type: 'number', required: false },
        { name: 'back_confirmations', type: 'number', required: false },
        { name: 'distinct_out_60m', type: 'number', required: false },
        { name: 'peak_concurrent', type: 'number', required: false },
        { name: 'last_activity_at', type: 'date', required: false },
        { name: 'auto_closed', type: 'bool' },
        created(),
        updated(),
      ],
      indexes: [
        'CREATE INDEX idx_events_zone ON events (zone)',
        'CREATE INDEX idx_events_status ON events (status)',
      ],
    })
    app.save(events)

    // ── reports (append-only; rl_key hidden, client_uuid idempotency) ───────
    const reports = new Collection({
      type: 'base',
      name: 'reports',
      listRule: PUBLIC, // hidden fields (rl_key) excluded automatically
      viewRule: PUBLIC,
      createRule: PUBLIC, // open create — hook-guarded in Phase 1 (rate-limit, snap, merge)
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'event', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: EVENTS_ID },
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['out', 'back'] },
        { name: 'lat', type: 'number', required: false },
        { name: 'lng', type: 'number', required: false },
        { name: 'source', type: 'select', required: true, maxSelect: 1, values: ['gps', 'manual'] },
        { name: 'note', type: 'text', required: false, max: 140 },
        { name: 'rl_key', type: 'text', required: false, hidden: true, max: 64 },
        { name: 'client_ts', type: 'date', required: false },
        { name: 'client_uuid', type: 'text', required: false, max: 64 },
        { name: 'flagged', type: 'bool' },
        { name: 'hidden', type: 'bool' },
        created(),
        updated(),
      ],
      indexes: [
        'CREATE INDEX idx_reports_zone ON reports (zone)',
        'CREATE INDEX idx_reports_event ON reports (event)',
        "CREATE UNIQUE INDEX idx_reports_uuid ON reports (client_uuid) WHERE client_uuid != ''",
      ],
    })
    app.save(reports)

    // ── zone_daily_stats (materialised charts) ──────────────────────────────
    const zds = new Collection({
      type: 'base',
      name: 'zone_daily_stats',
      listRule: PUBLIC,
      viewRule: PUBLIC,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'date', type: 'text', required: true, max: 10 }, // YYYY-MM-DD
        { name: 'outage_minutes', type: 'number', required: false },
        { name: 'event_count', type: 'number', required: false },
        { name: 'max_event_minutes', type: 'number', required: false },
        created(),
        updated(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_zds_zone_date ON zone_daily_stats (zone, date)'],
    })
    app.save(zds)

    // ── subscriptions (Web Push, anonymous — Phase 3 use) ───────────────────
    const subs = new Collection({
      type: 'base',
      name: 'subscriptions',
      listRule: ADMIN, // never publicly listable
      viewRule: ADMIN,
      createRule: ADMIN, // only via custom /api/go/subscribe route
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'endpoint', type: 'text', required: true, max: 1000 },
        { name: 'p256dh', type: 'text', required: false, max: 500 },
        { name: 'auth', type: 'text', required: false, max: 500 },
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'kinds', type: 'json', maxSize: 2000 },
        { name: 'rl_key', type: 'text', required: false, hidden: true, max: 64 },
        { name: 'expires_at', type: 'date', required: false },
        created(),
        updated(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_subs_endpoint ON subscriptions (endpoint)'],
    })
    app.save(subs)

    // ── read_models (cached JSON for /snapshot, /macro/:id, /national) ──────
    const rm = new Collection({
      type: 'base',
      name: 'read_models',
      listRule: PUBLIC,
      viewRule: PUBLIC,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'key', type: 'text', required: true, max: 100 }, // snapshot | macro:<id> | national
        { name: 'data', type: 'json', maxSize: 2000000 },
        created(),
        updated(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_rm_key ON read_models (key)'],
    })
    app.save(rm)
  },
  (app) => {
    // down — delete in reverse dependency order
    for (const name of ['read_models', 'subscriptions', 'zone_daily_stats', 'reports', 'events', 'zones']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {
        // already gone
      }
    }
  },
)
