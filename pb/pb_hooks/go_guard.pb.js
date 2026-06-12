/// <reference path="../pb_data/types.d.ts" />
// go_guard.pb.js — M2 anti-abuse: global 16 KB body cap on every /api/go/* POST.
// Per-field caps (sanitiseText) bound what we STORE; this bounds what we PARSE — a multi-MB JSON
// body was free CPU/memory for an attacker. Photo uploads are unaffected: they go through PB's
// native multipart record routes (/api/collections/…), never /api/go/*. Reports get the same check
// in reports_create.pb.js (they ride the native route). Content-Length unknown/chunked passes —
// PocketBase itself bounds total request size.
routerUse((e) => {
  try {
    if (e.request.method === 'POST' && String(e.request.url.path).indexOf('/api/go/') === 0) {
      const len = Number(e.request.contentLength)
      if (isFinite(len) && len > 16384) {
        return e.json(413, { message: 'request body too large' })
      }
    }
  } catch (_) { /* never block on guard errors */ }
  return e.next()
})
