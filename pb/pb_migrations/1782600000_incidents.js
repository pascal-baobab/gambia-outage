/// <reference path="../pb_data/types.d.ts" />
// 1782600000_incidents.js — anonymous civic incident reports (Phase 7 / INC-01).
//  incident_reports: anonymous media upload. The row carries ONLY rl_key + ip_key (both hidden:true,
//    daily-rotating, anti-abuse/throttle/dedupe ONLY). It MUST NOT carry account_id, report_id,
//    event_id, or any pseudonym field — invariant #1/#4 (CLAUDE.md). community-anonymity.test.ts
//    source-scans this block and fails the build if any of those identifiers appear here.
//    createRule='' (NOT null) so PB accepts multipart creates from the browser;
//    the onRecordCreateRequest hook in go_incidents.pb.js validates everything.
//  inc_rl: per-IP photo-upload rate-limit ledger (verbatim shape of lb_rl/sub_rl).
//    Rows carry ONLY ip_key + created — nothing that can correlate an incident with a reporter
//    or link ip_key back to pseudonym content (CLAUDE.md invariant #1).
migrate(
  (app) => {
    const incidents = new Collection({
      type: 'base',
      name: 'incident_reports',
      // createRule='' so PB native multipart records route accepts the upload;
      // hook validates everything. All other rules null (non-public reads/writes).
      createRule: '',
      listRule: null, viewRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'category', type: 'text',   required: true,  max: 20 },
        { name: 'text',     type: 'text',   required: false, max: 280 },
        { name: 'lat',      type: 'number', required: true  },
        { name: 'lng',      type: 'number', required: true  },
        { name: 'hidden',   type: 'bool' },
        // Anti-abuse keys — daily-rotating, NEVER returned in public API responses.
        // hidden:true means PB strips them from the raw collection API response automatically.
        { name: 'rl_key',  type: 'text',   required: false, max: 64, hidden: true },
        { name: 'ip_key',  type: 'text',   required: false, max: 64, hidden: true },
        // Photo — required:false at collection level so PB accepts the multipart and the hook
        // can reject a missing photo with a clean 400 (required:true at collection level gives
        // a PB-level 400 before the hook runs, which bypasses quota check ordering — D-06).
        // maxSize 5 MB; mimeTypes restrict to JPEG/PNG/WebP.
        { name: 'photo',   type: 'file',   required: false, maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inc_hidden_created ON incident_reports (hidden, created)',
        'CREATE INDEX idx_inc_category ON incident_reports (category)',
        'CREATE INDEX idx_inc_ip_key ON incident_reports (ip_key)',
      ],
    })
    app.save(incidents)

    const incRl = new Collection({
      type: 'base',
      name: 'inc_rl',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'ip_key',  type: 'text',     required: true,  max: 64 },
        { name: 'created', type: 'autodate', onCreate: true,  onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_inc_rl_ip_created ON inc_rl (ip_key, created)'],
    })
    app.save(incRl)
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId('inc_rl')) } catch (_) {}
    try { app.delete(app.findCollectionByNameOrId('incident_reports')) } catch (_) {}
  },
)
