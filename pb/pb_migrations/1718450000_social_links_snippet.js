/// <reference path="../pb_data/types.d.ts" />
// Widen social_links.snippet (280 → 1200) so auto-monitored "From Facebook" cards can carry the
// post body text (~10–12 lines, extracted from the Tavily result content) under the headline.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    const f = c.fields.getByName('snippet')
    f.max = 1200
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    const f = c.fields.getByName('snippet')
    f.max = 280
    app.save(c)
  },
)
