# CLAUDE.md — Gambia Outage (gambiaoutage.com)

> Architecture & contributor reference. This project is built with AI assistance,
> in the open — this file is the working brief the AI (and humans) read first.
> Deep-dive on privacy → `docs/PRIVACY.md`. Narrative history → `docs/CHANGELOG.md`.
> Product vision → `docs/VISION.md`. Governance → `GOVERNANCE.md`.

## What this is
Zero-registration, mobile-first **PWA** for reporting power cuts in The Gambia
(OUT/BACK by GPS or area). Brand: **GAMBIA OUTAGE** · payoff **"Report the Dark"** ·
circular C∞O logo (`design/assets/logo-circle.png`) · Gambian-flag accents.

## Source of truth
- **UI/UX/copy/states/data-shapes** → `design/` (clickable React-over-Babel prototype).
- **Implementation** → code is truth; update this file with every new decision/threshold/endpoint.

## Architecture
- **Frontend:** React 18 + Vite + TS + Tailwind, PWA (vite-plugin-pwa/Workbox),
  TanStack Query + Zustand, Leaflet 1.9.4 (lazy) + CARTO tiles, hand-rolled SVG charts.
  TQ hooks: `useSnapshot`/`useSocial`/`useFeed`/`useStats`/`useCommunityLinks`
  (`useData.ts`, `queryKeys.ts`).
- **RegionMaps** (`components/RegionMaps.tsx`): inline SVG, ONLY on `ZoneScreen` macro
  view. Geometry: `lib/regionGeo.ts` + `lib/regionArt.ts`; shapes lazy from
  `web/public/region-shapes.json`.
- **Radio** (`RadioPlayer.tsx`): slim strip above BottomNav, 14-station set
  (`RADIO_STATIONS` in `lib/constants.ts`). HTTPS-only streams; exclusive playback;
  state in `app/radioStore.ts`. Now-playing: `lib/nowPlaying.ts` shows "Artist — Title"
  + cover in the strip and on the lockscreen (`mediaSession`).
- **i18n:** EN/FR/AR (RTL). `web/src/i18n/en.ts` = contract; `fr.ts`/`ar.ts` implement
  it (**build fails on a missing key**). `langStore` persists `go_lang`. Components:
  `const t = useT()`. Admin + SVG charts = English-only. **Wolof & Mandinka wanted —
  see CONTRIBUTING.md.**
- **Ambassador:** `#/ambassador/:token` auto-activates a badge + XP. ⚠ No `rl_key` on
  ambassador tables.
- **Moderators:** `profiles.is_moderator=true` grants in-app HARD delete of any content
  via `POST /api/go/mod/delete` (`go.modDelete`) — `account_id`-gated, hourly-capped,
  audited in `mod_log` (`mod_account`, **never linked to reports**).
- **Versioning:** `APP_VERSION` in `lib/constants.ts`, format `0.MINOR`, auto-bumped
  every release by `deploy/release.sh`. The minor is an integer (`0.99 → 0.100`).
  **Never edit the version by hand.** SW auto-update on cold open (`lib/appRefresh.ts`).
- **Backend:** PocketBase. Hooks: `pb_hooks/lib/go.js`; `go_*.pb.js` +
  `reports_create.pb.js` + `go_crons.pb.js`.
- **Sidecars:** `pb/push-worker` (VAPID Web Push).
- **Edge:** Cloudflare Tunnel → `127.0.0.1:8090`. Brotli + edge-cache static;
  micro-cache `/api/go/*` ~10s; SSE bypassed.

## Core invariants (MUST hold) — see docs/PRIVACY.md
1. **Anonymous reports.** `rl_key = sha256(IP + UA[:40] + DAILY_SALT)` +
   `ip_key = sha256('ip:' + IP + DAILY_SALT)` — throttle/dedupe/Sybil-cap ONLY, both
   daily-rotating, both `hidden:true` on `reports`. **NO `account_id`/`rl_key`/`ip_key`
   linkage** from social/XP/profile back to a report.
2. **Restore = community signal.** "Back" is zone-level + Sybil-resistant (distinct
   `rl_key`). Events auto-close as a backstop.
3. **Decoupled gamification.** XP via `claim_nonce` + `xp_grants` — no report ref.
   `account_id = sha256(local 256-bit secret)`.
4. **Pseudonym ≠ reporter.** Social content attributed to pseudonym, **NEVER linked to
   reports**. Guarded by `community-anonymity.test.ts`.
5. **Map-first ↔ aggressive-lite.** Leaflet lazy-loads; data-saver = list-first.

## Trust layer + Status
`confirms` = distinct-reporter OUT count in last 60 min, **Sybil-capped at
`distinctIPs × IP_DEVICE_MULT`** (`distinctReporters60m` in `go.js`) so UA rotation
from one IP can't inflate it. `confirmed = confirms >= CONFIRM_THRESHOLD` (8). Decay
via a 5-min cron. `ip_key` re-anchors trust to the network layer (UA is
attacker-controlled): per-IP hourly cap `RL_IP_HOURLY`; distinct-IP floor
`BACK_CLOSE_IP_FLOOR` to close an event. **Requires** PB
`trustedProxy.headers=['CF-Connecting-IP']` so `e.realIP()` is the real client IP
behind the tunnel.
Statuses: `on` · `out` · `partial` · `estimated` (baseline) · `nodata` (reports===0).
**`displayStatus`** (`lib/status.ts`): `reports===0` ⇒ `nodata`; a stale auto-closed
event ⇒ `nodata` ("Awaiting reports", never a falsely-lit bulb). Read-models expose a
**`since`** time (dark-since / back-since) on macro+quarter+pin payloads.

Configuration (thresholds, caps, geo-gate, baseline) is documented in
[.env.example](.env.example). Production values may differ from the defaults there.

## Commands
- **Web:** `pnpm -C web dev` · `pnpm -C web build` · `pnpm -C web test`
- **PB:** `./pocketbase serve --http 127.0.0.1:8090` · `pb/setup.sh`
- **Seed:** `pnpm -C data seed`
- **Self-hosting:** see `.env.example` and the `deploy/` scripts.

## Gotchas ⚠
- **PB JSVM isolation:** hook handlers can't see file-scope vars — inline everything or
  `require()`. Symptom: `ReferenceError` only on that path.
- **Never flag `lat`/`lng`/`client_uuid` `hidden`** — PB strips them from the request
  body, silently breaking GPS snap + dedupe.
- **Never store `rl_key` on social/subscription rows** — undoes the anonymity invariant.
- **JSON fields are string-like** — `.get("data").x` silently fails; use `go.jsonField()`.

## Change workflow
- **Design-led:** new screens/flows → prototype in `design/` → update this file → implement.
- **Code-led:** backend, bugs, perf — work directly.
- **Every new feature:** update `CLAUDE.md` + add a `docs/CHANGELOG.md` entry.
- **Test in a 390×844 mobile viewport** — this app is built for cheap phones, never desktop.

---
Copy rule: neutral / evidence-based. UI/code language: **English only** (The Gambia's
official language) — zero Italian. Built for The Gambia, as a public good — see GOVERNANCE.md.
