/// <reference path="../pb_data/types.d.ts" />
// Self-declared "home neighbourhood" on the pseudonym profile. The user PICKS a quarter (GPS-optional
// to detect) — it is NOT derived from their anonymous reports, so the report stream stays fully
// decoupled (no account_id on reports, no zone on the XP ledger). Published via /api/go/profile/intro.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('profiles')
    c.fields.add(new TextField({ name: 'home_zone', required: false, max: 64 }))
    c.fields.add(new TextField({ name: 'home_zone_name', required: false, max: 120 }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('profiles')
    c.fields.removeByName('home_zone')
    c.fields.removeByName('home_zone_name')
    app.save(c)
  },
)
