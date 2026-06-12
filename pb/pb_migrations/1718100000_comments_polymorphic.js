/// <reference path="../pb_data/types.d.ts" />
// Make `comments` polymorphic: a comment can hang off a zone (neighbour discussion), a social_links
// card ("From Facebook" / live), or a question (Q&A answer). Replaces the single `zone` relation with
// (target_type, target_id). Existing zone comments are backfilled to target_type='zone'.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('comments')
    c.fields.add(new TextField({ name: 'target_type', required: false, max: 16 })) // zone|social|question
    c.fields.add(new TextField({ name: 'target_id', required: false, max: 64 }))
    app.save(c)

    // backfill existing zone comments → (zone, <zoneId>) so the new reader finds them
    try {
      const rows = app.findRecordsByFilter('comments', '', '', 100000, 0)
      rows.forEach((r) => {
        if (r.get('target_type')) return
        const z = r.get('zone')
        r.set('target_type', 'zone')
        r.set('target_id', z || '')
        app.save(r)
      })
    } catch (_) { /* empty table */ }

    // drop the old zone index + relation (target_id carries the zone id now), add the target index
    const c2 = app.findCollectionByNameOrId('comments')
    c2.indexes = (c2.indexes || []).filter((s) => !/idx_comments_zone/.test(s))
    try { c2.fields.removeByName('zone') } catch (_) {}
    c2.indexes.push('CREATE INDEX idx_comments_target ON comments (target_type, target_id)')
    app.save(c2)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('comments')
    const ZONES_ID = app.findCollectionByNameOrId('zones').id
    c.indexes = (c.indexes || []).filter((s) => !/idx_comments_target/.test(s))
    try { c.fields.add(new RelationField({ name: 'zone', required: false, maxSelect: 1, cascadeDelete: false, collectionId: ZONES_ID })) } catch (_) {}
    c.fields.removeByName('target_type')
    c.fields.removeByName('target_id')
    c.indexes.push('CREATE INDEX idx_comments_zone ON comments (zone)')
    app.save(c)
  },
)
