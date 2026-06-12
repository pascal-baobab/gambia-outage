/// <reference path="../pb_data/types.d.ts" />
// 1782100000_ambassador_requests.js — ambassador request collection.
// Users can request ambassador status; admin (ATPC superuser) can accept or reject.
// No rl_key, no report linkage. account_id is pseudonymous capability only.
migrate(
  (app) => {
    const col = new Collection({
      type: 'base',
      name: 'ambassador_requests',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'account_id', type: 'text',   required: true, max: 64 },
        { name: 'message',    type: 'text',   required: false, max: 500 },
        { name: 'status',     type: 'text',   required: true },
        { name: 'nickname',   type: 'text',   required: false, max: 60 },
        { name: 'created',    type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'reviewed_at', type: 'date',  required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ambassador_requests_account ON ambassador_requests (account_id)'],
    })
    app.save(col)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('ambassador_requests'))
  },
)
