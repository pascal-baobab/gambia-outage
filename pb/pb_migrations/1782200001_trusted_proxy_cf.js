/// <reference path="../pb_data/types.d.ts" />
// 1782200001_trusted_proxy_cf.js — make e.realIP() return the REAL client IP behind the CF Tunnel.
//
// The only ingress is the Cloudflare Tunnel → 127.0.0.1:8090 (CLAUDE.md: "CF Tunnel only"). Without
// a trusted-proxy config, PocketBase's e.realIP() returns the SOCKET address — which for every
// request is the tunnel's 127.0.0.1. That silently collapses the whole anonymity/Sybil layer:
//   - rl_key = sha256(IP + UA + salt) would vary by UA ALONE (IP constant) → two real users on the
//     same browser/OS UA dedupe into one "reporter", and the new ip_key cap would see ONE IP for the
//     entire country (distinctIPs = 1 → every confirm count capped at IP_DEVICE_MULT).
// Trusting CF-Connecting-IP fixes both. Safe here because the tunnel is the sole, trusted ingress and
// CF strips/overwrites this header at its edge (it cannot be spoofed by the client). useLeftmostIP
// stays false (CF-Connecting-IP is a single authoritative value, not an appendable list like XFF).
migrate(
  (app) => {
    const s = app.settings()
    s.trustedProxy.headers = ['CF-Connecting-IP']
    s.trustedProxy.useLeftmostIP = false
    app.save(s)
  },
  (app) => {
    const s = app.settings()
    s.trustedProxy.headers = []
    s.trustedProxy.useLeftmostIP = false
    app.save(s)
  },
)
