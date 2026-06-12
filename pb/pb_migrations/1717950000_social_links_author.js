/// <reference path="../pb_data/types.d.ts" />
// 1717950000_social_links_author.js — add `author` (the source page / profile name, e.g.
// "What's On Gambia", "InsideGambia.com") to social_links. Scraped from og:title by the Telegram
// bot when it ingests a link; shown as the post's source. Separate from `title` (which stays the
// owner's optional manual caption). Non-PII, no reporter linkage — anonymity unaffected.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.add(new TextField({ name: 'author', required: false, max: 120 }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.removeByName('author')
    app.save(c)
  },
)
