// flags.ts — phase feature flags.
// SINGLE_REPORT_TRUTH: in this low-adoption phase a single report flips the bulb (latest signal
// wins) instead of waiting for CONFIRM_THRESHOLD=8. The 8-confirm count survives only as the "·N"
// strength number. Flip to false to restore the threshold-8 "REPORTED/probably out" semantics
// once adoption grows (no redeploy of the visual change needed — just this constant + a rebuild).
export const SINGLE_REPORT_TRUTH = true

// GEO_GATE: outage reporting is restricted to inside The Gambia (owner: a report from Senegal or
// Italy must not be possible). This flag controls the UX (disable the report buttons + show a note);
// the backend (CF-IPCountry in reports_create.pb.js) is the real enforcement. Visitor country is read
// from Cloudflare's edge /cdn-cgi/trace. Set false to drop the UX gate (and GEO_GATE=false on the
// server to drop the backend gate). GEO_ALLOW mirrors the server allowlist.
export const GEO_GATE = true
export const GEO_ALLOW = ['GM']
