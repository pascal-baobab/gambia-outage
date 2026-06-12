# pb/ — Pocketbase backend

Single Go binary: SQLite + REST + realtime SSE + admin UI + JS hooks. Bound to **`:8090`**.
Pinned to **Pocketbase v0.39.0** (the migration/hook API is version-specific — keep it in
lock-step with `pb_migrations/`).

## Layout
- `pocketbase` — the binary (gitignored; fetch via `./setup.sh`).
- `pb_migrations/` — schema as code. `1717200000_init_collections.js` creates the 6 collections
  (`zones`, `events`, `reports`, `zone_daily_stats`, `subscriptions`, `read_models`) with the
  §4.9 API rules. `zones.id` is a stable slug; `zones.parent` is a self-relation added in a
  second save (a collection can't reference itself at create time).
- `pb_hooks/` — JS hooks/routes. `go_read_models.pb.js` serves `/api/go/{snapshot,national,macro/:id}`
  (Phase 0 returns the launch baseline). Phase 1 adds `reports_create` (rl_key, rate-limit,
  sanitise, snap, merge) + the recompute crons.
- `pb_public/` — `web/dist` is copied here at deploy so PB serves SPA + API + SSE on one port.
- `push-worker/` — Node Web Push sidecar (Phase 3).

## ⚠ JSVM gotcha (learned in Phase 0)
`routerAdd` / hook handlers run in an **isolated** runtime — they **cannot** see file-scope
`const`/`function` declarations. Inline everything a handler needs (or use `require()`).
Symptom: `ReferenceError: X is not defined` only once a code path actually runs.

## Local dev
```bash
./setup.sh                                              # download the pinned binary
./pocketbase superuser create admin@gambiaoutage.com '<password>'
./pocketbase serve --http 127.0.0.1:8090                # applies migrations, loads hooks
pnpm -C ../data seed                                    # 7 macros + 54 quarters (idempotent)
../scripts/smoke-test.sh                                # asserts health + read-models
```
Admin UI: http://127.0.0.1:8090/_/ · Data dir `pb_data/` (gitignored).
