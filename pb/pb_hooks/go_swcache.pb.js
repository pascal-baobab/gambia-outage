// go_swcache.pb.js — serve the PWA service-worker entry points with `Cache-Control: no-cache` so the
// Cloudflare edge never pins an old build. Post-mortem 2026-06-10: /sw.js was edge-cached (HIT,
// max-age=14400) — installed PWAs asking for the update kept receiving the crashing v0.100 worker for
// hours AFTER the v0.101 hotfix was live (fresh browsers were fine: index.html is DYNAMIC). no-cache
// forces an edge revalidation on every SW update check, which is exactly what a service worker needs:
// it IS the update mechanism, it must never be stale. (If a CF Cache Rule with an Edge-TTL override
// exists for *.js it would ignore this header — verify cf-cache-status after deploy.)
// ⚠ 2026-06-12: confirmed CF's GLOBAL Browser Cache TTL (~4h) WAS overriding this header on /sw.js
// (edge-cached as a .js static → browser received max-age=14400 → iOS PWAs stuck on the old build for
// up to 4h; reload didn't help — it re-used the HTTP-cached worker). FIX (live in CF, NOT in this repo):
// a Cache Rule in the http_request_cache_settings ruleset bypasses cache (`cache:false`) for /sw.js +
// /registerSW.js, so the origin no-cache header reaches the browser (verified: cf-cache-status DYNAMIC).
// After ANY CF cache reconfig, re-verify: a GET on /sw.js MUST return `cache-control: no-cache`.
// NB (PB JSVM isolation): handlers can't see file-scope vars — everything inlined per route.
routerAdd('GET', '/sw.js', (e) => {
  e.response.header().set('Cache-Control', 'no-cache, must-revalidate')
  return e.blob(200, 'application/javascript; charset=utf-8', $os.readFile(__hooks + '/../pb_public/sw.js'))
})

routerAdd('GET', '/registerSW.js', (e) => {
  e.response.header().set('Cache-Control', 'no-cache, must-revalidate')
  return e.blob(200, 'application/javascript; charset=utf-8', $os.readFile(__hooks + '/../pb_public/registerSW.js'))
})
