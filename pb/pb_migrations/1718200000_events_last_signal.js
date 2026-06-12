/// <reference path="../pb_data/types.d.ts" />
// Per-zone "latest signal" so the display layer can flip the bulb on a single report:
// most-recent OUT → DARK, most-recent BACK → LIGHT, even while the event is technically still open
// (SINGLE_REPORT_TRUTH phase). The trust pipeline (confirms/Sybil close) is unchanged underneath.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('events')
    c.fields.add(new TextField({ name: 'last_signal_type', required: false, max: 4 })) // 'out' | 'back'
    c.fields.add(new DateField({ name: 'last_signal_at', required: false }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('events')
    c.fields.removeByName('last_signal_type')
    c.fields.removeByName('last_signal_at')
    app.save(c)
  },
)
