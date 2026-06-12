/// <reference path="../pb_data/types.d.ts" />
// 1781500000_account_recovery.js — optional, PII-free account recovery (name + password).
//
// A user may set a password tied to their unique name. On a NEW phone they enter name + password to
// get their account capability (account_id) back — restoring their name, XP and social identity. NO
// phone number, NO email: the unique username IS the identifier, the password is the secret.
//
// Anonymity P0 (unchanged): the password lives on the server-only `usernames` registry next to the
// account_id capability; it carries NO rl_key and is NEVER linked to the anonymous `reports` stream.
// The hash is a salted, iterated sha256 (`salt$hash`); the DB is never publicly exposed, and online
// brute-force is stopped by a per-name lockout (pw_fails / pw_locked_until). All access via
// /api/go/account/* (server-only rules, like /api/go/name*).
migrate(
  (app) => {
    const usernames = app.findCollectionByNameOrId('usernames')
    usernames.fields.add(new Field({ name: 'pass_hash', type: 'text', max: 200 })) // 'salt$iteratedSha256'
    usernames.fields.add(new Field({ name: 'pw_fails', type: 'number' }))           // consecutive failed recovers
    usernames.fields.add(new Field({ name: 'pw_locked_until', type: 'text', max: 40 })) // ISO; recover locked until then
    app.save(usernames)
  },
  (app) => {
    const usernames = app.findCollectionByNameOrId('usernames')
    usernames.fields.removeByName('pass_hash')
    usernames.fields.removeByName('pw_fails')
    usernames.fields.removeByName('pw_locked_until')
    app.save(usernames)
  },
)
