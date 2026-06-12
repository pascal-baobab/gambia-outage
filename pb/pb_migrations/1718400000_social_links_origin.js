/// <reference path="../pb_data/types.d.ts" />
// `origin` on social_links — distinguishes how a "From Facebook" row was ingested:
//   'auto'    → machine-monitored from a known Gambian page (tooling/fb-monitor, Tavily poller)
//   ''/curated → owner hand-picked via the Telegram bot (legacy + default)
// Drives the discreet "auto-tracked" affordance in the UI. NON-PII, no reporter linkage — the
// social stream is never tied to reports (anonymity invariants untouched). Legacy rows have no
// value → the read-model treats '' as 'curated'.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.add(new TextField({ name: 'origin', required: false, max: 12 }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.removeByName('origin')
    app.save(c)
  },
)
