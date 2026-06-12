// geo.ts — visitor country for the report geo-gate (see flags.ts GEO_GATE).
//
// Read from Cloudflare's edge endpoint /cdn-cgi/trace, which returns a `loc=XX` line with the
// visitor's ISO-3166-1 country. It's served by the CF edge (not the origin) per-request and is NOT
// edge-cached, so it never leaks one visitor's country to another (unlike the micro-cached /api/go/*).
// No PII is stored — only the 2-letter country is used, to decide whether to show/hide the report UX.
// The backend (CF-IPCountry header in reports_create.pb.js) is the real enforcement; this is UX only.
let cached: Promise<string | null> | null = null

export function visitorCountry(): Promise<string | null> {
  if (cached) return cached
  cached = fetch('/cdn-cgi/trace', { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((text) => {
      const m = text.match(/^loc=([A-Z]{2})$/m)
      return m ? m[1] : null
    })
    .catch(() => null) // network/edge error → unknown → callers fail OPEN (never block on uncertainty)
  return cached
}
