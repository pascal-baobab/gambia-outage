/// <reference path="../pb_data/types.d.ts" />
// 1718350000_push_out_kind.js — allow 'out' (power-out) push alerts alongside 'back' (power-back).
// Widens push_queue.kind to ['back','out']. subscriptions.kinds (json) already holds the per-device
// preference and needs no schema change. Anonymity unchanged (subscriptions carry no account/rl_key).
migrate((app) => {
  const c = app.findCollectionByNameOrId('push_queue')
  const f = c.fields.getByName('kind')
  // SelectField — widen the allowed values.
  f.values = ['back', 'out']
  app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId('push_queue')
  const f = c.fields.getByName('kind')
  f.values = ['back']
  app.save(c)
})
