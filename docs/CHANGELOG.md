# Changelog — Gambia Outage

> Public changelog, started at the open-sourcing of the project (June 2026).
> Earlier development (v0.1 → v0.118, May–June 2026) happened in a private
> repository; its outcome is summarized in the first entry below.

## v0.119 — 2026-06-12 · Initial public release

The state of the app as it went open source:

- **Core loop:** anonymous OUT/BACK reporting by GPS (coarsened at rest) or area
  pick; zone status engine (`on / out / partial / estimated / nodata`) with
  community confirmation (8 distinct reporters), decay, auto-close backstops and
  honest "Awaiting reports" rendering for stale closures; dark-since / back-since
  times on every zone.
- **Trust & anti-abuse:** daily-rotating salted keys (`rl_key`/`ip_key`), per-IP
  rate caps, Sybil-capped distinct-reporter counting, distinct-IP floors for event
  closure; geo-gate (reports only from inside The Gambia).
- **Privacy architecture:** zero-registration design; pseudonyms cryptographically
  decoupled from reports; XP via anonymous claim-nonces; invariants enforced by an
  automated test suite (see `docs/PRIVACY.md`).
- **PWA:** installable, offline report outbox with idempotent replay, data-saver
  lite mode, lazy map (Leaflet + CARTO), service-worker auto-update.
- **Community:** pseudonymous posts/questions/comments, neighbour opt-in presence,
  community links with anti-abuse auto-hide, moderator hard-delete with audit log,
  XP/badges/Wall of Honor, ambassador program.
- **Push:** per-zone Web Push subscriptions (multi-zone, one device), VAPID
  worker sidecar with region↔quarter fan-out and liveness monitoring.
- **i18n:** English, French, Arabic (RTL) under a build-enforced key contract.
- **Extras:** 14-station Gambian/regional radio strip with live now-playing
  metadata; hand-rolled SVG charts; national/region SVG maps.
