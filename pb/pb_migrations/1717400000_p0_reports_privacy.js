/// <reference path="../pb_data/types.d.ts" />
// P0 hardening (security/p0-hardening) — close the de-anonymisation hole on `reports`.
//
// Before: reports.listRule/viewRule = "" (public) → GET /api/collections/reports/records
// returned the RAW GPS (lat/lng), free-text notes and client_uuid of every anonymous report,
// defeating the project's core anonymity promise. The only intended public surface is the
// read-models (/api/go/*), which never expose raw GPS.
//
// After: reports is hook/admin-only for reads (createRule stays PUBLIC so the anonymous report
// pipeline still works — it's guarded by reports_create.pb.js). That alone removes the public
// exposure of lat/lng/notes/client_uuid. GPS privacy AT REST is handled in the create hook,
// which coarsens GPS to ~1km (2 dp) and drops it for manual picks.
//
// NB: we deliberately DON'T flag lat/lng/client_uuid as `hidden`. PocketBase strips hidden
// fields from the request body the create hook reads (it binds them out for non-superuser
// requests), which would silently break GPS snapping and client_uuid dedupe. Non-public read
// rules already keep these fields off the public surface.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('reports')
    c.listRule = null // admin/hook only — no public listing of raw reports
    c.viewRule = null // admin/hook only — no public single-record reads
    app.save(c)
  },
  (app) => {
    // down — restore the previous (public) read rules
    const c = app.findCollectionByNameOrId('reports')
    c.listRule = ''
    c.viewRule = ''
    app.save(c)
  },
)
