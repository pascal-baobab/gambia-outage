/// <reference path="../pb_data/types.d.ts" />
// 1781000000_unique_usernames.js — forced, globally-unique public pseudonyms.
//
// Every user picks a name that is unique case-insensitively (one owner for modou == Modou == MODOU).
// The name can be CHANGED, but only once per 60 days (Facebook-style cooldown). The home quarter stays
// freely changeable (that lives on profiles.home_zone, untouched here).
//
// Anonymity P0 (unchanged): the registry maps a NAME → its owner account_id (a server-only device
// capability) and is server-only (every rule null, all access via /api/go/name*). It NEVER carries an
// rl_key and is NEVER linked to the anonymous `reports` stream — exactly like profiles/connections.
//
// Grandfathering: existing profile nicknames are reserved into the registry on up-migration (first
// holder wins; later duplicates are skipped — they keep their current name, but the name is now
// reserved against NEW claims). So no existing user is disturbed, yet new users can't take a name that
// someone already shows.
migrate(
  (app) => {
    // profiles: the cooldown anchor (ISO timestamp of the last name set/change). Empty = never set via
    // the new flow → a grandfathered user may change once immediately, then the 60-day cooldown begins.
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.add(new Field({ name: 'name_changed_at', type: 'text', max: 40 }))
    app.save(profiles)

    // usernames: the unique-name registry. name_lower is the DB-enforced case-insensitive unique key.
    const usernames = new Collection({
      type: 'base',
      name: 'usernames',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 24 },       // display form (as typed)
        { name: 'name_lower', type: 'text', required: true, max: 24 },  // lowercased → unique key
        { name: 'account', type: 'text', required: true, max: 64 },     // owner pseudonym capability
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_usernames_lower ON usernames (name_lower)',
        'CREATE INDEX idx_usernames_account ON usernames (account)',
      ],
    })
    app.save(usernames)

    // Grandfather: reserve every existing non-empty nickname (first holder wins; dupes skipped).
    let profs = []
    try { profs = app.findRecordsByFilter('profiles', "nickname != ''", 'created', 100000, 0) } catch (_) { /* none */ }
    for (const p of profs) {
      const nick = String(p.get('nickname') || '').trim().replace(/\s+/g, ' ')
      if (!nick) continue
      try {
        const u = new Record(app.findCollectionByNameOrId('usernames'))
        u.set('name', nick)
        u.set('name_lower', nick.toLowerCase())
        u.set('account', String(p.get('account_id') || ''))
        app.save(u)
      } catch (_) { /* duplicate name_lower → the first holder already reserved it; grandfather the rest */ }
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('usernames'))
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.fields.removeByName('name_changed_at')
    app.save(profiles)
  },
)
