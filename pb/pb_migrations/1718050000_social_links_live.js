/// <reference path="../pb_data/types.d.ts" />
// LIVE monitoring space: owner-curated live streams (Facebook/TikTok/Instagram/YouTube) surfaced as
// a "LIVE now" strip. Ingested via the Telegram bot's /live command; auto-expire via the go_decay
// cron once live_expires_at passes. Same `social_links` stream as the From-Facebook cards.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.add(new BoolField({ name: 'is_live', required: false }))
    c.fields.add(new TextField({ name: 'platform', required: false, max: 16 })) // facebook|tiktok|instagram|youtube|link
    c.fields.add(new DateField({ name: 'live_expires_at', required: false }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('social_links')
    c.fields.removeByName('is_live')
    c.fields.removeByName('platform')
    c.fields.removeByName('live_expires_at')
    app.save(c)
  },
)
