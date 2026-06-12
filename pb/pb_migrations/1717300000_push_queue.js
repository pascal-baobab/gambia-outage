/// <reference path="../pb_data/types.d.ts" />
// push_queue — the contract between the PB JSVM close-hook (enqueue) and the Node push-worker
// (poll → send via web-push → delete). PB hooks can't run web-push, so the hook only writes a
// row here; the sidecar polls. Crash-safe: unsent rows survive a worker restart.
// Admin-only (the worker authenticates as superuser; nothing public touches this).
migrate(
  (app) => {
    const ADMIN = null
    const EVENTS_ID = 'events123456789'
    const ZONES_ID = 'zones1234567890'

    const q = new Collection({
      type: 'base',
      name: 'push_queue',
      listRule: ADMIN,
      viewRule: ADMIN,
      createRule: ADMIN,
      updateRule: ADMIN,
      deleteRule: ADMIN,
      fields: [
        { name: 'event', type: 'relation', required: false, maxSelect: 1, cascadeDelete: true, collectionId: EVENTS_ID },
        { name: 'zone', type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID },
        { name: 'zone_name', type: 'text', required: false, max: 200 },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['back'] },
        { name: 'attempts', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      // one queue row per (event, kind) — the close hook is idempotent under retries.
      indexes: [
        'CREATE UNIQUE INDEX idx_pq_event_kind ON push_queue (event, kind)',
        'CREATE INDEX idx_pq_created ON push_queue (created)',
      ],
    })
    app.save(q)
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId('push_queue')) } catch (_) {}
  },
)
