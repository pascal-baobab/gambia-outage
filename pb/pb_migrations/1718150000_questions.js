/// <reference path="../pb_data/types.d.ts" />
// Q&A board ("Talk" tab): pseudonymous questions. Answers are `comments` with target_type='question'.
// Non-public reads (served only via /api/go/* routes — no enumeration). Auto-moderation only
// (sanitiseText + per-account hourly cap + owner hide via `hidden`).
migrate(
  (app) => {
    const c = new Collection({
      type: 'base',
      name: 'questions',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'account_id', type: 'text', required: true, max: 64 },
        { name: 'nickname', type: 'text', required: false, max: 24 },
        { name: 'avatar_id', type: 'text', required: false, max: 40 },
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'body', type: 'text', required: false, max: 280 },
        { name: 'hidden', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_questions_created ON questions (created)',
        'CREATE INDEX idx_questions_account ON questions (account_id)',
      ],
    })
    app.save(c)
  },
  (app) => { app.delete(app.findCollectionByNameOrId('questions')) },
)
