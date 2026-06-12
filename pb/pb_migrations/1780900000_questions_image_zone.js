/// <reference path="../pb_data/types.d.ts" />
// Talk board upgrade: questions gain an optional on-device-optimised PHOTO + an optional ZONE tag
// (the poster's neighbourhood, so Talk reads as a users/neighbourhoods board). createRule="" makes
// questions publicly creatable via the records API (so the client can multipart-upload the photo),
// guarded by the go_qa.pb.js create hook — exactly the community_links pattern. Anonymity is untouched:
// the row still carries only the device pseudonym, never an rl_key, never a link to outage reports.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('questions')
    c.createRule = '' // public create, validated/forced by the onRecordCreateRequest hook
    c.fields.add(new Field({ name: 'zone', type: 'text', required: false, max: 60 }))
    c.fields.add(new Field({
      name: 'image', type: 'file', required: false, maxSelect: 1, maxSize: 5242880,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('questions')
    c.createRule = null
    c.fields.removeByName('zone')
    c.fields.removeByName('image')
    app.save(c)
  },
)
